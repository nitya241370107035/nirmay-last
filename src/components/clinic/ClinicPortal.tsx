import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Heart,
  HelpCircle,
  Hospital,
  Info,
  Layers,
  Percent,
  PlusCircle,
  Printer,
  RefreshCw,
  Search,
  ShieldAlert,
  Stethoscope,
  Thermometer,
  User,
  Wind,
  XCircle,
  Building2,
  LogOut,
  MapPin,
  Edit3,
  Calendar,
  Zap,
  FileText
} from 'lucide-react';
import { LanguageCode } from '../../types';
import { getTranslations, getChiefComplaintCategories, getChiefComplaintLabel, getRiskDetails } from '../../utils/translations';
import { ClinicLogin, ClinicProfile } from './ClinicLogin';
import { DoctorStation } from './DoctorStation';
import { EMRRecordsStation } from './EMRRecordsStation';
import { ClinicAppointmentsDesk } from './ClinicAppointmentsDesk';
import { saveClinicRecord, seedEnrolledClinicsIfEmpty } from '../../db/db';

interface PatientInfo {
  name: string;
  age: number;
  gender: 'Male' | 'Female';
  phone?: string;
  uhid?: string;
}

interface PatientVitals {
  heartRate: number;
  respiratoryRate: number;
  bodyTemperature: number;
  oxygenSaturation: number;
  systolicBp: number;
  diastolicBp: number;
  age: number;
  gender: 'Male' | 'Female';
  derivedBmi: number;
  heightCm?: number;
  weightKg?: number;
}

interface AdaptiveQuestion {
  symptomId: string;
  symptomName: string;
  category: string;
  isRedFlag: boolean;
  question: {
    en: string;
    hi: string;
    gu: string;
  };
  relevanceScore: number;
  clinicalReason: string;
}

interface QuestionHistoryEntry {
  turn: number;
  symptomId: string;
  symptomName: string;
  answer: 1 | 0 | null;
  timestamp: number;
}

interface PredictionResult {
  success: boolean;
  riskCategory: 'Low' | 'Medium' | 'High';
  confidence: number;
  probabilities: {
    Low: number;
    Medium: number;
    High: number;
  };
  clinicalFlags: Array<{ level: 'CRITICAL' | 'WARNING'; message: string }>;
  disposition: {
    urgency: string;
    action: string;
    color: string;
    timeframe: string;
  };
  activeSymptomsCount: number;
  activeSymptoms: Array<{ id: string; name: string; category: string; is_red_flag: boolean }>;
}

interface ClinicPortalProps {
  onSwitchPortal?: () => void;
}

export function ClinicPortal({ onSwitchPortal }: ClinicPortalProps) {
  const { i18n } = useTranslation();
  const currentLang = (i18n.language || 'en') as LanguageCode;
  const t = getTranslations(currentLang);

  // Clinic Authentication & Profile State
  const [clinicProfile, setClinicProfile] = useState<ClinicProfile | null>(() => {
    const saved = localStorage.getItem('niramay_clinic_profile');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.isLoggedIn && parsed.clinicName) {
          return parsed;
        }
      } catch {
        return null;
      }
    }
    return null;
  });

  const [activeTab, setActiveTab] = useState<'triage' | 'emr_records' | 'doctor_station' | 'appointments'>('triage');

  // Wizard Stepper: 1: Vitals & Info, 2: Chief Complaint, 3: Dynamic Inquiry, 4: Triage Result
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  useEffect(() => {
    seedEnrolledClinicsIfEmpty();
  }, []);

  // Form State: Patient Info
  const [patientInfo, setPatientInfo] = useState<PatientInfo>({
    name: '',
    age: 45,
    gender: 'Male',
    phone: '',
    uhid: `CLN-${Math.floor(100000 + Math.random() * 900000)}`
  });

  // Form State: Vitals
  const [vitals, setVitals] = useState<PatientVitals>({
    heartRate: 78,
    respiratoryRate: 16,
    bodyTemperature: 37.0,
    oxygenSaturation: 98,
    systolicBp: 120,
    diastolicBp: 80,
    age: 45,
    gender: 'Male',
    derivedBmi: 23.5,
    heightCm: 168,
    weightKg: 66
  });

  const [tempUnit, setTempUnit] = useState<'C' | 'F'>('C');
  const [chiefComplaint, setChiefComplaint] = useState<string>('cc_fever');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Session & Question State
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<AdaptiveQuestion | null>(null);
  const [questionHistory, setQuestionHistory] = useState<QuestionHistoryEntry[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [predictionResult, setPredictionResult] = useState<PredictionResult | null>(null);
  const [modelMetadata, setModelMetadata] = useState<any>(null);

  // Fetch metadata on mount
  useEffect(() => {
    fetch('/api/clinic/metadata')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setModelMetadata(data);
        }
      })
      .catch((err) => console.error('Failed to load clinic metadata:', err));
  }, []);

  // Recalculate BMI automatically whenever height, weight, or age changes
  useEffect(() => {
    if (vitals.heightCm && vitals.weightKg && vitals.heightCm > 0) {
      const hMeters = vitals.heightCm / 100;
      const bmi = Number((vitals.weightKg / (hMeters * hMeters)).toFixed(1));
      setVitals((prev) => ({ ...prev, derivedBmi: bmi, age: patientInfo.age, gender: patientInfo.gender }));
    }
  }, [vitals.heightCm, vitals.weightKg, patientInfo.age, patientInfo.gender]);

  // Vitals Health Status Helpers
  const getSpo2Status = (spo2: number) => {
    if (spo2 < 90) return { label: 'Severe Hypoxia', color: 'text-red-700 bg-red-100 border-red-300' };
    if (spo2 < 95) return { label: 'Mild Hypoxia', color: 'text-amber-700 bg-amber-100 border-amber-300' };
    return { label: 'Normal', color: 'text-emerald-700 bg-emerald-100 border-emerald-300' };
  };

  const getHrStatus = (hr: number) => {
    if (hr > 120) return { label: 'Severe Tachycardia', color: 'text-red-700 bg-red-100 border-red-300' };
    if (hr > 100) return { label: 'Tachycardia', color: 'text-amber-700 bg-amber-100 border-amber-300' };
    if (hr < 50) return { label: 'Severe Bradycardia', color: 'text-red-700 bg-red-100 border-red-300' };
    if (hr < 60) return { label: 'Bradycardia', color: 'text-amber-700 bg-amber-100 border-amber-300' };
    return { label: 'Normal', color: 'text-emerald-700 bg-emerald-100 border-emerald-300' };
  };

  const getBpStatus = (sbp: number, dbp: number) => {
    if (sbp >= 180 || dbp >= 110) return { label: 'Crisis High BP', color: 'text-red-700 bg-red-100 border-red-300' };
    if (sbp >= 140 || dbp >= 90) return { label: 'Hypertension', color: 'text-amber-700 bg-amber-100 border-amber-300' };
    if (sbp < 90 || dbp < 50) return { label: 'Hypotension (Low BP)', color: 'text-red-700 bg-red-100 border-red-300' };
    return { label: 'Normal BP', color: 'text-emerald-700 bg-emerald-100 border-emerald-300' };
  };

  const getTempStatus = (tempC: number) => {
    if (tempC >= 39.0) return { label: 'High Fever', color: 'text-red-700 bg-red-100 border-red-300' };
    if (tempC >= 37.6) return { label: 'Fever', color: 'text-amber-700 bg-amber-100 border-amber-300' };
    if (tempC < 35.5) return { label: 'Hypothermia', color: 'text-blue-700 bg-blue-100 border-blue-300' };
    return { label: 'Normal', color: 'text-emerald-700 bg-emerald-100 border-emerald-300' };
  };

  // Quick preset loader
  const loadPreset = (type: 'normal' | 'fever_cold' | 'cardiac_emergency' | 'acute_abdominal') => {
    if (type === 'normal') {
      setPatientInfo({ name: 'Sanjay Sharma', age: 38, gender: 'Male', phone: '9876543210', uhid: `CLN-${Math.floor(100000 + Math.random() * 900000)}` });
      setVitals({ heartRate: 74, respiratoryRate: 15, bodyTemperature: 36.8, oxygenSaturation: 99, systolicBp: 118, diastolicBp: 78, age: 38, gender: 'Male', derivedBmi: 22.4, heightCm: 172, weightKg: 66 });
      setChiefComplaint('cc_coldlikesymptoms');
    } else if (type === 'fever_cold') {
      setPatientInfo({ name: 'Priya Mehra', age: 29, gender: 'Female', phone: '9876501234', uhid: `CLN-${Math.floor(100000 + Math.random() * 900000)}` });
      setVitals({ heartRate: 96, respiratoryRate: 18, bodyTemperature: 38.6, oxygenSaturation: 98, systolicBp: 122, diastolicBp: 80, age: 29, gender: 'Female', derivedBmi: 21.8, heightCm: 160, weightKg: 56 });
      setChiefComplaint('cc_fever');
    } else if (type === 'cardiac_emergency') {
      setPatientInfo({ name: 'Dharmesh Varma', age: 64, gender: 'Male', phone: '9822334455', uhid: `CLN-${Math.floor(100000 + Math.random() * 900000)}` });
      setVitals({ heartRate: 118, respiratoryRate: 26, bodyTemperature: 37.2, oxygenSaturation: 91, systolicBp: 168, diastolicBp: 104, age: 64, gender: 'Male', derivedBmi: 29.5, heightCm: 168, weightKg: 83 });
      setChiefComplaint('cc_chestpain');
    } else if (type === 'acute_abdominal') {
      setPatientInfo({ name: 'Anjali Desai', age: 32, gender: 'Female', phone: '9811223344', uhid: `CLN-${Math.floor(100000 + Math.random() * 900000)}` });
      setVitals({ heartRate: 108, respiratoryRate: 20, bodyTemperature: 38.2, oxygenSaturation: 97, systolicBp: 100, diastolicBp: 65, age: 32, gender: 'Female', derivedBmi: 23.0, heightCm: 162, weightKg: 60 });
      setChiefComplaint('cc_abdominalpain');
    }
  };

  // Start Clinic Dynamic Intake
  const startClinicIntake = async () => {
    setIsSubmitting(true);
    try {
      const payload = {
        patientInfo,
        vitals,
        chiefComplaint,
        maxQuestions: 5
      };

      const res = await fetch('/api/clinic/session/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (data.success) {
        setSessionId(data.sessionId);
        setCurrentQuestion(data.nextQuestion);
        setQuestionHistory(data.session?.questionHistory || []);
        setStep(3);
      }
    } catch (err) {
      console.error('Error starting clinic session:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Answer Symptom Question
  const handleAnswerQuestion = async (answer: 1 | 0 | null) => {
    if (!sessionId || !currentQuestion) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/clinic/answer-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          symptomId: currentQuestion.symptomId,
          answer
        })
      });
      const data = await res.json();

      if (data.success) {
        setQuestionHistory(data.session?.questionHistory || []);
        if (data.nextQuestion && !data.isStoppingCriteriaMet) {
          setCurrentQuestion(data.nextQuestion);
        } else {
          // Intake questions completed, auto-trigger triage prediction
          await runFinalTriage(sessionId);
        }
      }
    } catch (err) {
      console.error('Error answering question:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Run Final Triage Prediction
  const runFinalTriage = async (activeSessionId?: string) => {
    setIsSubmitting(true);
    try {
      const sid = activeSessionId || sessionId;
      const res = await fetch('/api/clinic/predict-risk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sid,
          vitals,
          symptoms: {}
        })
      });
      const data = await res.json();
      if (data.success) {
        setPredictionResult(data);
        setStep(4);

        // Auto-save to Paperless Digital Clinical EMR
        if (clinicProfile) {
          try {
            await saveClinicRecord({
              uhid: patientInfo.uhid || `CLN-${Math.floor(100000 + Math.random() * 900000)}`,
              patientName: patientInfo.name || 'Anonymous Patient',
              age: patientInfo.age,
              gender: patientInfo.gender,
              phone: patientInfo.phone || '',
              villageCity: clinicProfile.cityDistrict || 'Local',
              clinicFacilityCode: clinicProfile.facilityCode,
              clinicName: clinicProfile.clinicName,
              department: clinicProfile.department,
              encounterDate: new Date().toISOString(),
              entrySource: 'triage_ml',
              chiefComplaint: chiefComplaint.replace('cc_', '').toUpperCase(),
              symptomsSummary: (data.activeSymptoms || []).map((s: any) => s.name),
              vitals: {
                heartRate: vitals.heartRate,
                respiratoryRate: vitals.respiratoryRate,
                bodyTemperature: vitals.bodyTemperature,
                oxygenSaturation: vitals.oxygenSaturation,
                systolicBp: vitals.systolicBp,
                diastolicBp: vitals.diastolicBp,
                heightCm: vitals.heightCm,
                weightKg: vitals.weightKg,
                derivedBmi: vitals.derivedBmi
              },
              triageResult: {
                riskCategory: data.riskCategory,
                confidence: data.confidence,
                probabilities: data.probabilities,
                clinicalFlags: data.clinicalFlags,
                disposition: data.disposition
              },
              clinicalImpression: '',
              provisionalDiagnosis: '',
              finalDiagnosis: '',
              doctorNotes: '',
              prescriptions: [],
              labInvestigations: [],
              status: 'Waiting Doctor',
              attendingDoctor: clinicProfile.doctorInCharge,
              doctorDegree: clinicProfile.doctorDegree,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            });
          } catch (dbErr) {
            console.error('Error auto-saving encounter to EMR:', dbErr);
          }
        }
      }
    } catch (err) {
      console.error('Error running triage prediction:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset Form for New Patient
  const handleReset = () => {
    setStep(1);
    setSessionId(null);
    setCurrentQuestion(null);
    setQuestionHistory([]);
    setPredictionResult(null);
    setPatientInfo({
      name: '',
      age: 40,
      gender: 'Male',
      phone: '',
      uhid: `CLN-${Math.floor(100000 + Math.random() * 900000)}`
    });
  };

  // Categorized Chief Complaints localized dynamically
  const categoryIcons = [
    <Wind className="w-5 h-5 text-sky-600" key="resp" />,
    <Heart className="w-5 h-5 text-rose-600" key="cardio" />,
    <Activity className="w-5 h-5 text-amber-600" key="gi" />,
    <Zap className="w-5 h-5 text-purple-600" key="neuro" />,
    <ShieldAlert className="w-5 h-5 text-emerald-600" key="meta" />
  ];

  const chiefComplaintCategories = getChiefComplaintCategories(currentLang).map((cat, idx) => ({
    ...cat,
    icon: categoryIcons[idx] || <Activity className="w-5 h-5 text-teal-600" />
  }));

  // Authentication Guard: Show Clinic Login if not logged in
  if (!clinicProfile || !clinicProfile.isLoggedIn) {
    return (
      <ClinicLogin
        onLoginSuccess={(profile) => setClinicProfile(profile)}
        onBackToPortalSelector={onSwitchPortal}
      />
    );
  }

  const handleClinicLogout = () => {
    localStorage.removeItem('niramay_clinic_profile');
    setClinicProfile(null);
    handleReset();
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 font-sans text-slate-800">
      {/* Top Clinic Header */}
      <div className="bg-gradient-to-r from-[#0C3833] via-[#124B45] to-[#1A5C56] text-white rounded-3xl shadow-xl p-6 sm:p-7 mb-6 border border-[#2E7D73]/40">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-white/15 p-3.5 rounded-2xl backdrop-blur-sm border border-white/20 shadow-inner">
              <Hospital className="w-8 h-8 text-teal-200" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight">{clinicProfile.clinicName}</h1>
                <span className="bg-emerald-400/20 text-emerald-200 text-xs px-2.5 py-0.5 rounded-full border border-emerald-400/30 font-mono font-bold">
                  {clinicProfile.facilityCode}
                </span>
                <span className="bg-cyan-400/20 text-cyan-200 text-xs px-2.5 py-0.5 rounded-full border border-cyan-400/30 font-medium">
                  {clinicProfile.department}
                </span>
              </div>
              
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-teal-100/90 mt-1.5 font-medium">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-teal-300" />
                  {clinicProfile.address}, {clinicProfile.cityDistrict} ({clinicProfile.state})
                </span>
                <span className="text-teal-400/40 hidden sm:inline">•</span>
                <span className="flex items-center gap-1">
                  <Stethoscope className="w-3.5 h-3.5 text-teal-300" />
                  MO: <strong>{clinicProfile.doctorInCharge}</strong> ({clinicProfile.doctorDegree})
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* Direct Trilingual Language Switcher */}
            <div className="flex items-center gap-1 bg-black/25 p-1 rounded-xl border border-white/20 shadow-xs">
              {[
                { code: 'gu', label: 'ગુજરાતી' },
                { code: 'hi', label: 'हिन्दी' },
                { code: 'en', label: 'EN' }
              ].map((l) => (
                <button
                  key={l.code}
                  onClick={() => i18n.changeLanguage(l.code)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    currentLang === l.code
                      ? 'bg-white text-teal-900 shadow-sm'
                      : 'text-teal-100 hover:text-white hover:bg-white/15'
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>

            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-white/15 hover:bg-white/25 active:scale-95 text-white text-xs sm:text-sm font-bold rounded-xl border border-white/20 shadow-xs transition cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{t.newPatient}</span>
            </button>
            <button
              onClick={handleClinicLogout}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-white/10 hover:bg-white/20 active:scale-95 text-teal-100 hover:text-white text-xs sm:text-sm font-semibold rounded-xl border border-white/20 shadow-xs transition cursor-pointer"
              title="Sign Out / Switch Clinic Credentials"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t.editClinic}</span>
            </button>
            {onSwitchPortal && (
              <button
                onClick={onSwitchPortal}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-500/20 hover:bg-rose-500/30 active:scale-95 text-rose-200 text-xs sm:text-sm font-bold rounded-xl border border-rose-400/30 shadow-xs transition cursor-pointer"
                title="Exit to Portal Selection Gate"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t.switchPortal}</span>
              </button>
            )}
          </div>
        </div>

        {/* Top Primary Clinic Module Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-6 pt-5 border-t border-white/15 font-sans">
          <button
            onClick={() => setActiveTab('triage')}
            className={`py-2.5 px-3 rounded-2xl text-xs sm:text-sm font-black transition flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'triage'
                ? 'bg-white text-[#0C3833] shadow-md'
                : 'bg-white/10 text-teal-100 hover:bg-white/20'
            }`}
          >
            <Activity className="w-4 h-4 text-emerald-600" />
            <span>{t.triageStationTab}</span>
          </button>

          <button
            onClick={() => setActiveTab('emr_records')}
            className={`py-2.5 px-3 rounded-2xl text-xs sm:text-sm font-black transition flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'emr_records'
                ? 'bg-white text-[#0C3833] shadow-md'
                : 'bg-white/10 text-teal-100 hover:bg-white/20'
            }`}
          >
            <FileText className="w-4 h-4 text-cyan-400" />
            <span>{t.emrRecordsTab}</span>
          </button>

          <button
            onClick={() => setActiveTab('doctor_station')}
            className={`py-2.5 px-3 rounded-2xl text-xs sm:text-sm font-black transition flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'doctor_station'
                ? 'bg-white text-[#0C3833] shadow-md'
                : 'bg-white/10 text-teal-100 hover:bg-white/20'
            }`}
          >
            <Stethoscope className="w-4 h-4 text-teal-300" />
            <span>{t.doctorStationTab}</span>
          </button>

          <button
            onClick={() => setActiveTab('appointments')}
            className={`py-2.5 px-3 rounded-2xl text-xs sm:text-sm font-black transition flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'appointments'
                ? 'bg-white text-[#0C3833] shadow-md'
                : 'bg-white/10 text-teal-100 hover:bg-white/20'
            }`}
          >
            <Calendar className="w-4 h-4 text-amber-400" />
            <span>{t.appointmentsTab}</span>
          </button>
        </div>
      </div>

      {/* RENDER VIEW 1: DIGITAL EMR RECORDS (INTAKE & REGISTRY) */}
      {activeTab === 'emr_records' && (
        <EMRRecordsStation
          clinicProfile={clinicProfile}
          onSendToDoctorConsultation={(record) => {
            setActiveTab('doctor_station');
          }}
        />
      )}

      {/* RENDER VIEW 2: DOCTOR CONSULTATION & PRESCRIPTION STATION */}
      {activeTab === 'doctor_station' && (
        <DoctorStation
          clinicProfile={clinicProfile}
          onOpenTriageForPatient={(name, uhid, complaint) => {
            setPatientInfo({ ...patientInfo, name, uhid });
            setActiveTab('triage');
            setStep(1);
          }}
        />
      )}

      {/* RENDER VIEW 3: CLINIC APPOINTMENTS DESK */}
      {activeTab === 'appointments' && (
        <ClinicAppointmentsDesk
          clinicProfile={clinicProfile}
          onIntakePatientForTriage={(name, age, gender, phone, complaint) => {
            setPatientInfo({
              ...patientInfo,
              name,
              age,
              gender,
              phone,
              uhid: `CLN-${Math.floor(100000 + Math.random() * 900000)}`
            });
            setActiveTab('triage');
            setStep(1);
          }}
        />
      )}

      {/* RENDER VIEW 4: ML TRIAGE WIZARD */}
      {activeTab === 'triage' && (
        <div className="space-y-6">
          {/* Stepper Navigation */}
          <div className="bg-gradient-to-r from-[#0C3833] to-[#124B45] text-white p-3 rounded-2xl shadow-sm grid grid-cols-4 gap-2">
            <button
              onClick={() => setStep(1)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-left transition ${
                step === 1 ? 'bg-white text-teal-900 font-bold shadow-md' : 'bg-white/10 text-teal-100 hover:bg-white/15'
              }`}
            >
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step === 1 ? 'bg-teal-700 text-white' : 'bg-white/20 text-white'}`}>
                1
              </span>
              <span className="text-xs sm:text-sm truncate">{t.step1}</span>
            </button>

            <button
              onClick={() => setStep(2)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-left transition ${
                step === 2 ? 'bg-white text-teal-900 font-bold shadow-md' : 'bg-white/10 text-teal-100 hover:bg-white/15'
              }`}
            >
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step === 2 ? 'bg-teal-700 text-white' : 'bg-white/20 text-white'}`}>
                2
              </span>
              <span className="text-xs sm:text-sm truncate">{t.step2}</span>
            </button>

            <button
              onClick={() => sessionId && setStep(3)}
              disabled={!sessionId}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-left transition ${
                step === 3 ? 'bg-white text-teal-900 font-bold shadow-md' : !sessionId ? 'opacity-50 cursor-not-allowed bg-white/5 text-teal-200' : 'bg-white/10 text-teal-100 hover:bg-white/15'
              }`}
            >
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step === 3 ? 'bg-teal-700 text-white' : 'bg-white/20 text-white'}`}>
                3
              </span>
              <span className="text-xs sm:text-sm truncate">{t.step3}</span>
            </button>

            <button
              onClick={() => predictionResult && setStep(4)}
              disabled={!predictionResult}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-left transition ${
                step === 4 ? 'bg-white text-teal-900 font-bold shadow-md' : !predictionResult ? 'opacity-50 cursor-not-allowed bg-white/5 text-teal-200' : 'bg-white/10 text-teal-100 hover:bg-white/15'
              }`}
            >
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step === 4 ? 'bg-teal-700 text-white' : 'bg-white/20 text-white'}`}>
                4
              </span>
              <span className="text-xs sm:text-sm truncate">{t.step4}</span>
            </button>
          </div>

      {/* ================= STEP 1: PATIENT REGISTRATION & MANDATORY VITALS ================= */}
      {step === 1 && (
        <div className="space-y-6">
          {/* Quick Presets Bar */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              Quick Clinical Presets:
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => loadPreset('normal')}
                className="text-xs px-2.5 py-1 bg-white border border-slate-300 hover:border-teal-500 text-slate-700 rounded-lg hover:bg-teal-50 transition"
              >
                Routine Cold Checkup
              </button>
              <button
                onClick={() => loadPreset('fever_cold')}
                className="text-xs px-2.5 py-1 bg-white border border-slate-300 hover:border-teal-500 text-slate-700 rounded-lg hover:bg-teal-50 transition"
              >
                High Fever Patient
              </button>
              <button
                onClick={() => loadPreset('cardiac_emergency')}
                className="text-xs px-2.5 py-1 bg-white border border-rose-300 hover:border-rose-500 text-rose-700 rounded-lg hover:bg-rose-50 transition"
              >
                Chest Pain & Hypoxia
              </button>
              <button
                onClick={() => loadPreset('acute_abdominal')}
                className="text-xs px-2.5 py-1 bg-white border border-amber-300 hover:border-amber-500 text-amber-700 rounded-lg hover:bg-amber-50 transition"
              >
                Acute Abdominal Pain
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Demographics */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
                <User className="w-5 h-5 text-teal-600" />
                Patient Registration
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Full Patient Name</label>
                  <input
                    type="text"
                    value={patientInfo.name}
                    onChange={(e) => setPatientInfo({ ...patientInfo, name: e.target.value })}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Age (Years) *</label>
                    <input
                      type="number"
                      min={18}
                      max={95}
                      value={patientInfo.age}
                      onChange={(e) => setPatientInfo({ ...patientInfo, age: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none text-sm font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Gender *</label>
                    <select
                      value={patientInfo.gender}
                      onChange={(e) => setPatientInfo({ ...patientInfo, gender: e.target.value as any })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none text-sm font-semibold"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Height (cm)</label>
                    <input
                      type="number"
                      value={vitals.heightCm || 168}
                      onChange={(e) => setVitals({ ...vitals, heightCm: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Weight (kg)</label>
                    <input
                      type="number"
                      value={vitals.weightKg || 65}
                      onChange={(e) => setVitals({ ...vitals, weightKg: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none text-sm"
                    />
                  </div>
                </div>

                <div className="bg-teal-50/70 border border-teal-200 rounded-xl p-3 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-teal-800">Derived BMI</span>
                    <p className="text-xl font-extrabold text-teal-900">{vitals.derivedBmi} <span className="text-xs font-normal text-teal-700">kg/m²</span></p>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                    vitals.derivedBmi > 30 ? 'bg-amber-100 text-amber-800' : vitals.derivedBmi < 18.5 ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {vitals.derivedBmi > 30 ? 'Obese' : vitals.derivedBmi > 25 ? 'Overweight' : vitals.derivedBmi < 18.5 ? 'Underweight' : 'Normal BMI'}
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Encounter / UHID No.</label>
                  <input
                    type="text"
                    value={patientInfo.uhid}
                    onChange={(e) => setPatientInfo({ ...patientInfo, uhid: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 text-slate-600 rounded-xl text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Right Column (2 cols wide): Mandatory Vitals Entry */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Stethoscope className="w-5 h-5 text-teal-600" />
                  Mandatory Clinical Vitals
                </h2>
                <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                  <Info className="w-3.5 h-3.5 text-teal-600" />
                  Real-time clinical threshold evaluation
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Heart Rate */}
                <div className="p-4 bg-slate-50/80 border border-slate-200 rounded-2xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Heart className="w-4 h-4 text-rose-500" />
                      Heart Rate (Pulse)
                    </span>
                    {(() => {
                      const st = getHrStatus(vitals.heartRate);
                      return <span className={`text-[11px] px-2 py-0.5 rounded-md font-bold border ${st.color}`}>{st.label}</span>;
                    })()}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={vitals.heartRate}
                      onChange={(e) => setVitals({ ...vitals, heartRate: Number(e.target.value) })}
                      className="w-full px-3 py-2 text-lg font-bold bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    />
                    <span className="text-xs text-slate-500 font-semibold">bpm</span>
                  </div>
                  <span className="text-[11px] text-slate-400 mt-1 block">Normal: 60 – 100 bpm</span>
                </div>

                {/* SpO2 */}
                <div className="p-4 bg-slate-50/80 border border-slate-200 rounded-2xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Percent className="w-4 h-4 text-sky-500" />
                      Oxygen Saturation (SpO2)
                    </span>
                    {(() => {
                      const st = getSpo2Status(vitals.oxygenSaturation);
                      return <span className={`text-[11px] px-2 py-0.5 rounded-md font-bold border ${st.color}`}>{st.label}</span>;
                    })()}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step={0.5}
                      min={70}
                      max={100}
                      value={vitals.oxygenSaturation}
                      onChange={(e) => setVitals({ ...vitals, oxygenSaturation: Number(e.target.value) })}
                      className="w-full px-3 py-2 text-lg font-bold bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    />
                    <span className="text-xs text-slate-500 font-semibold">%</span>
                  </div>
                  <span className="text-[11px] text-slate-400 mt-1 block">Normal: 95 – 100% (Critical: &lt;90%)</span>
                </div>

                {/* Blood Pressure (Systolic & Diastolic) */}
                <div className="p-4 bg-slate-50/80 border border-slate-200 rounded-2xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Activity className="w-4 h-4 text-indigo-500" />
                      Blood Pressure (BP)
                    </span>
                    {(() => {
                      const st = getBpStatus(vitals.systolicBp, vitals.diastolicBp);
                      return <span className={`text-[11px] px-2 py-0.5 rounded-md font-bold border ${st.color}`}>{st.label}</span>;
                    })()}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <input
                        type="number"
                        placeholder="Sys"
                        value={vitals.systolicBp}
                        onChange={(e) => setVitals({ ...vitals, systolicBp: Number(e.target.value) })}
                        className="w-full px-2.5 py-2 text-base font-bold bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none text-center"
                      />
                    </div>
                    <span className="text-slate-400 font-bold">/</span>
                    <div className="flex-1">
                      <input
                        type="number"
                        placeholder="Dia"
                        value={vitals.diastolicBp}
                        onChange={(e) => setVitals({ ...vitals, diastolicBp: Number(e.target.value) })}
                        className="w-full px-2.5 py-2 text-base font-bold bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none text-center"
                      />
                    </div>
                    <span className="text-xs text-slate-500 font-semibold">mmHg</span>
                  </div>
                  <span className="text-[11px] text-slate-400 mt-1 block">Normal: 120 / 80 mmHg</span>
                </div>

                {/* Body Temperature */}
                <div className="p-4 bg-slate-50/80 border border-slate-200 rounded-2xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Thermometer className="w-4 h-4 text-amber-500" />
                      Body Temperature
                    </span>
                    {(() => {
                      const st = getTempStatus(vitals.bodyTemperature);
                      return <span className={`text-[11px] px-2 py-0.5 rounded-md font-bold border ${st.color}`}>{st.label}</span>;
                    })()}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step={0.1}
                      value={vitals.bodyTemperature}
                      onChange={(e) => setVitals({ ...vitals, bodyTemperature: Number(e.target.value) })}
                      className="w-full px-3 py-2 text-lg font-bold bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    />
                    <div className="flex bg-slate-200 rounded-lg p-0.5 text-xs font-bold">
                      <button
                        type="button"
                        onClick={() => setTempUnit('C')}
                        className={`px-2 py-1 rounded ${tempUnit === 'C' ? 'bg-white text-teal-800 shadow-sm' : 'text-slate-600'}`}
                      >
                        °C
                      </button>
                    </div>
                  </div>
                  <span className="text-[11px] text-slate-400 mt-1 block">Normal: 36.5 – 37.5 °C (97.7 – 99.5 °F)</span>
                </div>

                {/* Respiratory Rate */}
                <div className="p-4 bg-slate-50/80 border border-slate-200 rounded-2xl sm:col-span-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Wind className="w-4 h-4 text-teal-600" />
                      Respiratory Rate (Breaths per Minute)
                    </span>
                    <span className={`text-[11px] px-2 py-0.5 rounded-md font-bold border ${
                      vitals.respiratoryRate > 22 ? 'text-red-700 bg-red-100 border-red-300' : vitals.respiratoryRate < 12 ? 'text-amber-700 bg-amber-100 border-amber-300' : 'text-emerald-700 bg-emerald-100 border-emerald-300'
                    }`}>
                      {vitals.respiratoryRate > 22 ? 'Tachypnea (Rapid)' : vitals.respiratoryRate < 12 ? 'Bradypnea' : 'Normal Rate'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={8}
                      max={35}
                      value={vitals.respiratoryRate}
                      onChange={(e) => setVitals({ ...vitals, respiratoryRate: Number(e.target.value) })}
                      className="w-full accent-teal-600"
                    />
                    <span className="text-lg font-bold text-slate-800 w-16 text-right">{vitals.respiratoryRate} <span className="text-xs font-normal text-slate-500">/min</span></span>
                  </div>
                  <span className="text-[11px] text-slate-400 mt-1 block">Normal adult range: 12 – 20 breaths/min</span>
                </div>
              </div>

              {/* Action Button to Step 2 */}
              <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => setStep(2)}
                  className="flex items-center gap-2 px-6 py-3 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-xl shadow-md transition"
                >
                  Proceed to Chief Complaint Selection
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= STEP 2: CHIEF COMPLAINT PICKER ================= */}
      {step === 2 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-xl font-bold text-slate-900">{t.chiefComplaintTitle}</h2>
              <p className="text-sm text-slate-500 mt-0.5">
                {t.chiefComplaintDesc}
              </p>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder={t.searchComplaints}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Selected Chief Complaint Pill */}
          <div className="bg-teal-50 border border-teal-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="bg-teal-600 text-white p-2 rounded-xl">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-teal-800">
                  {currentLang === 'gu' ? 'પ્રાથમિક મુખ્ય તકલીફ' : currentLang === 'hi' ? 'प्राथमिक मुख्य समस्या' : 'Primary Presenting Complaint'}
                </span>
                <p className="text-lg font-extrabold text-teal-950 capitalize">
                  {getChiefComplaintLabel(chiefComplaint, currentLang)}
                </p>
              </div>
            </div>

            <button
              onClick={startClinicIntake}
              disabled={isSubmitting}
              className="w-full sm:w-auto px-6 py-3 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSubmitting ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5 text-amber-300" />}
              {t.startAdaptiveQuestions}
            </button>
          </div>

          {/* Categorized Complaint Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {chiefComplaintCategories.map((cat, idx) => {
              const filteredItems = cat.items.filter((item) =>
                item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.enLabel.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.id.toLowerCase().includes(searchQuery.toLowerCase())
              );

              if (filteredItems.length === 0) return null;

              return (
                <div key={idx} className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 hover:bg-slate-50 transition">
                  <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-200">
                    {cat.icon}
                    <h3 className="font-bold text-slate-800 text-sm">{cat.title}</h3>
                  </div>

                  <div className="space-y-1.5">
                    {filteredItems.map((item) => {
                      const isSelected = chiefComplaint === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setChiefComplaint(item.id)}
                          className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition cursor-pointer ${
                            isSelected
                              ? 'bg-teal-700 text-white shadow-sm'
                              : 'bg-white text-slate-700 border border-slate-200 hover:border-teal-400 hover:bg-teal-50/50'
                          }`}
                        >
                          <div className="flex flex-col">
                            <span className="font-bold">{item.label}</span>
                            {currentLang !== 'en' && (
                              <span className={`text-[10px] ${isSelected ? 'text-teal-100' : 'text-slate-400'}`}>
                                {item.enLabel}
                              </span>
                            )}
                          </div>
                          {isSelected && <CheckCircle2 className="w-4 h-4 text-white shrink-0 ml-2" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-between pt-4 border-t border-slate-100">
            <button
              onClick={() => setStep(1)}
              className="px-5 py-2.5 border border-slate-300 rounded-xl text-slate-700 font-semibold text-sm hover:bg-slate-50 transition cursor-pointer"
            >
              {t.back}
            </button>
            <button
              onClick={startClinicIntake}
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-xl shadow transition flex items-center gap-2 cursor-pointer"
            >
              {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
              {t.startAdaptiveQuestions}
            </button>
          </div>
        </div>
      )}

      {/* ================= STEP 3: DYNAMIC ADAPTIVE QUESTION FLOW ================= */}
      {step === 3 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Question Card (2 cols) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <div className="flex items-center gap-2">
                  <span className="bg-teal-100 text-teal-800 text-xs px-2.5 py-1 rounded-full font-bold">
                    Turn {questionHistory.length} of 5
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    Chief Complaint: <strong className="text-slate-800 capitalize">{chiefComplaint.replace('cc_', '')}</strong>
                  </span>
                </div>

                {currentQuestion?.isRedFlag && (
                  <span className="bg-rose-100 text-rose-800 text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1 border border-rose-200">
                    <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                    Critical Red-Flag Query
                  </span>
                )}
              </div>

              {currentQuestion ? (
                <div className="space-y-6 my-4">
                  {/* Context Reason Box */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-600 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-teal-600 flex-shrink-0" />
                    <span>
                      <strong>Clinical Context:</strong> {currentQuestion.clinicalReason}
                    </span>
                  </div>

                  {/* Main Question Prompt */}
                  <div className="p-6 bg-gradient-to-br from-slate-50 to-teal-50/40 rounded-2xl border border-teal-100">
                    <span className="text-xs font-bold text-teal-700 uppercase tracking-wider block mb-1">
                      Symptom Inquiry: {currentQuestion.symptomName}
                    </span>
                    <h3 className="text-xl md:text-2xl font-extrabold text-slate-900 leading-snug">
                      {currentLang === 'hi'
                        ? currentQuestion.question.hi
                        : currentLang === 'gu'
                        ? currentQuestion.question.gu
                        : currentQuestion.question.en}
                    </h3>
                  </div>

                  {/* Yes / No / Skip Response Buttons */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handleAnswerQuestion(1)}
                      className="p-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold shadow-md hover:shadow-lg transition flex flex-col items-center justify-center gap-1.5"
                    >
                      <CheckCircle2 className="w-6 h-6" />
                      <span className="text-base">Yes (Present)</span>
                      <span className="text-[11px] opacity-80">हा / હા</span>
                    </button>

                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handleAnswerQuestion(0)}
                      className="p-4 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-bold shadow-md hover:shadow-lg transition flex flex-col items-center justify-center gap-1.5"
                    >
                      <XCircle className="w-6 h-6" />
                      <span className="text-base">No (Absent)</span>
                      <span className="text-[11px] opacity-80">नहीं / ના</span>
                    </button>

                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handleAnswerQuestion(null)}
                      className="p-4 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-2xl font-bold transition flex flex-col items-center justify-center gap-1.5"
                    >
                      <HelpCircle className="w-6 h-6 text-slate-600" />
                      <span className="text-base">Unsure / Skip</span>
                      <span className="text-[11px] text-slate-600">अस्पष्ट / અસ્પષ્ટ</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-10">
                  <CheckCircle2 className="w-12 h-12 text-teal-600 mx-auto mb-3" />
                  <h3 className="text-lg font-bold text-slate-800">Dynamic Inquiries Completed</h3>
                  <p className="text-sm text-slate-500 mb-4">Sufficient clinical signal gathered for risk prediction.</p>
                  <button
                    onClick={() => runFinalTriage()}
                    className="px-6 py-3 bg-teal-700 text-white font-bold rounded-xl shadow hover:bg-teal-800 transition"
                  >
                    View Triage Assessment
                  </button>
                </div>
              )}

              {/* Instant Triage Trigger Button */}
              <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                <button
                  onClick={() => setStep(2)}
                  className="text-xs text-slate-500 hover:text-slate-800 font-semibold"
                >
                  Change Chief Complaint
                </button>
                <button
                  onClick={() => runFinalTriage()}
                  disabled={isSubmitting}
                  className="text-xs px-4 py-2 bg-slate-100 hover:bg-teal-100 text-teal-800 font-bold rounded-xl border border-slate-300 transition flex items-center gap-1.5"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  Calculate Risk Now (Early Triage)
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Live Encounter Summary & History */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <h3 className="text-sm font-bold text-slate-800 mb-3 pb-2 border-b border-slate-100 flex items-center gap-2">
                <Stethoscope className="w-4 h-4 text-teal-600" />
                Live Encounter Overview
              </h3>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">Patient:</span>
                  <span className="font-bold text-slate-800">{patientInfo.name || 'Unregistered'} ({patientInfo.age}y, {patientInfo.gender})</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">SpO2:</span>
                  <span className="font-bold text-slate-800">{vitals.oxygenSaturation}%</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">Heart Rate:</span>
                  <span className="font-bold text-slate-800">{vitals.heartRate} bpm</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">Blood Pressure:</span>
                  <span className="font-bold text-slate-800">{vitals.systolicBp}/{vitals.diastolicBp} mmHg</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Temperature:</span>
                  <span className="font-bold text-slate-800">{vitals.bodyTemperature}°C</span>
                </div>
              </div>
            </div>

            {/* Answer History */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <h3 className="text-sm font-bold text-slate-800 mb-3 pb-2 border-b border-slate-100">
                Question History ({questionHistory.length})
              </h3>
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {questionHistory.map((item, idx) => (
                  <div key={idx} className="p-2 bg-slate-50 rounded-xl border border-slate-200 text-xs flex items-center justify-between">
                    <span className="font-medium text-slate-700 truncate mr-2">{item.symptomName}</span>
                    <span className={`px-2 py-0.5 rounded font-bold text-[11px] ${
                      item.answer === 1 ? 'bg-emerald-100 text-emerald-800' : item.answer === 0 ? 'bg-rose-100 text-rose-800' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {item.answer === 1 ? 'Yes' : item.answer === 0 ? 'No' : 'Skip'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= STEP 4: CLINICAL TRIAGE DECISION & RISK RESULT ================= */}
      {step === 4 && predictionResult && (() => {
        const riskDetails = getRiskDetails(predictionResult.riskCategory, currentLang);
        return (
          <div className="space-y-6">
            {/* Main Risk Category Banner */}
            <div className={`p-6 rounded-3xl border shadow-lg ${
              predictionResult.riskCategory === 'High'
                ? 'bg-gradient-to-r from-red-700 via-rose-700 to-red-800 text-white border-red-900 shadow-red-100'
                : predictionResult.riskCategory === 'Medium'
                ? 'bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-600 text-white border-amber-700 shadow-amber-100'
                : 'bg-gradient-to-r from-emerald-700 via-teal-700 to-green-700 text-white border-emerald-800 shadow-emerald-100'
            }`}>
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="p-3.5 bg-white/20 backdrop-blur-md rounded-2xl border border-white/30">
                    <ShieldAlert className="w-10 h-10 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs uppercase tracking-widest font-extrabold bg-white/20 px-2.5 py-0.5 rounded-full">
                        {currentLang === 'gu' ? 'ટ્રાયજ વર્ગીકરણ' : currentLang === 'hi' ? 'ट्राइएज वर्गीकरण' : 'Triage Stratification'}
                      </span>
                      <span className="text-xs text-white/90">
                        {currentLang === 'gu' ? 'વિશ્વસનીયતા' : currentLang === 'hi' ? 'विश्वसनीयता' : 'Confidence'}: {(predictionResult.confidence * 100).toFixed(1)}%
                      </span>
                    </div>
                    <h2 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight mt-0.5">
                      {riskDetails.categoryTitle}
                    </h2>
                    <p className="text-white/90 text-xs sm:text-sm mt-1">
                      {riskDetails.categorySubtitle}
                    </p>
                  </div>
                </div>

                <div className="bg-white/15 backdrop-blur-md p-4 rounded-2xl border border-white/20 text-center min-w-[160px]">
                  <span className="text-xs text-white/80 uppercase font-semibold">{riskDetails.riskProbabilitiesLabel}</span>
                  <div className="grid grid-cols-3 gap-2 mt-1 text-xs font-bold">
                    <div className="p-1 rounded bg-white/10">
                      <span className="text-[10px] block opacity-80">{riskDetails.lowLabel}</span>
                      {(predictionResult.probabilities.Low * 100).toFixed(0)}%
                    </div>
                    <div className="p-1 rounded bg-white/10">
                      <span className="text-[10px] block opacity-80">{riskDetails.medLabel}</span>
                      {(predictionResult.probabilities.Medium * 100).toFixed(0)}%
                    </div>
                    <div className="p-1 rounded bg-white/10">
                      <span className="text-[10px] block opacity-80">{riskDetails.highLabel}</span>
                      {(predictionResult.probabilities.High * 100).toFixed(0)}%
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Critical Red Flags Box if any */}
            {predictionResult.clinicalFlags && predictionResult.clinicalFlags.length > 0 && (
              <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-4">
                <h3 className="text-sm font-bold text-red-900 flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  {currentLang === 'gu' ? 'સક્રિય ક્લિનિકલ ચેતવણી ચિહ્નો મળ્યા' : currentLang === 'hi' ? 'सक्रिय क्लिनिकल चेतावनी संकेत' : 'Active Clinical Warning Flags Detected'}
                </h3>
                <ul className="space-y-1 text-xs text-red-800 font-medium list-disc list-inside">
                  {predictionResult.clinicalFlags.map((flag, idx) => (
                    <li key={idx}>
                      <strong className="font-bold">[{flag.level}]</strong> {flag.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Disposition & Action Plan */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-100">
                  <Stethoscope className="w-5 h-5 text-teal-600" />
                  {riskDetails.actionPlanTitle}
                </h3>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{riskDetails.immediateActionLabel}</span>
                  <p className="text-base font-bold text-slate-800 mt-1">
                    {riskDetails.immediateAction}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-3 bg-teal-50/60 border border-teal-200 rounded-xl">
                    <span className="font-bold text-teal-900 block mb-1">{riskDetails.investigationsLabel}</span>
                    <ul className="list-disc list-inside text-teal-800 space-y-0.5">
                      {riskDetails.recommendedInvestigations.map((inv, i) => (
                        <li key={i}>{inv}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <span className="font-bold text-slate-800 block mb-1">{riskDetails.vitalsRecordLabel}</span>
                    <div className="space-y-1 text-slate-600">
                      <p><strong>SpO2:</strong> {predictionResult.vitalsEvaluated.oxygenSaturation}%</p>
                      <p><strong>{currentLang === 'gu' ? 'પલ્સ / ધબકારા' : currentLang === 'hi' ? 'हृदय गति' : 'Heart Rate'}:</strong> {predictionResult.vitalsEvaluated.heartRate} bpm</p>
                      <p><strong>BP:</strong> {predictionResult.vitalsEvaluated.systolicBp} / {predictionResult.vitalsEvaluated.diastolicBp} mmHg</p>
                      <p><strong>{currentLang === 'gu' ? 'તાપમાન' : currentLang === 'hi' ? 'तापमान' : 'Temperature'}:</strong> {predictionResult.vitalsEvaluated.bodyTemperature} °C</p>
                      <p><strong>BMI:</strong> {predictionResult.vitalsEvaluated.derivedBmi} kg/m²</p>
                    </div>
                  </div>
                </div>

                {/* Active Symptoms Tags */}
                <div>
                  <span className="text-xs font-bold text-slate-700 block mb-2">{riskDetails.confirmedSymptomsLabel} ({predictionResult.activeSymptoms.length})</span>
                  <div className="flex flex-wrap gap-2">
                    {predictionResult.activeSymptoms.map((s) => (
                      <span
                        key={s.id}
                        className={`text-xs px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 border ${
                          s.is_red_flag
                            ? 'bg-rose-100 text-rose-800 border-rose-300'
                            : 'bg-teal-50 text-teal-800 border-teal-200'
                        }`}
                      >
                        {s.is_red_flag && <AlertTriangle className="w-3 h-3 text-rose-600" />}
                        {getChiefComplaintLabel(s.id, currentLang) || s.name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column: Printable Slip Action */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-slate-800 pb-2 border-b border-slate-100 flex items-center gap-2">
                  <Printer className="w-4 h-4 text-teal-600" />
                  {riskDetails.slipTitle}
                </h3>

                <div className="p-4 border-2 border-dashed border-teal-300 rounded-2xl bg-slate-50/90 text-xs space-y-3 shadow-inner">
                  <div className="text-center pb-2.5 border-b border-slate-200">
                    <span className="text-[10px] uppercase tracking-widest font-extrabold text-teal-800 bg-teal-100/80 px-2 py-0.5 rounded">
                      {riskDetails.slipHeader}
                    </span>
                    <h4 className="font-black text-slate-900 text-sm uppercase mt-1 tracking-tight">
                      {clinicProfile.clinicName}
                    </h4>
                    <p className="text-[11px] text-slate-600 font-medium leading-tight mt-0.5">
                      {clinicProfile.address}, {clinicProfile.cityDistrict}, {clinicProfile.state} - {clinicProfile.pincode}
                    </p>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                      Reg / Facility ID: <strong>{clinicProfile.facilityCode}</strong> • Dept: {clinicProfile.department} • Ph: {clinicProfile.phone}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {currentLang === 'gu' ? 'તારીખ અને સમય' : currentLang === 'hi' ? 'दिनांक एवं समय' : 'Date & Time'}: {new Date().toLocaleString()}
                    </p>
                  </div>

                  <div className="space-y-1 text-slate-700">
                    <div className="flex justify-between">
                      <span><strong>{riskDetails.patientLabel}:</strong> {patientInfo.name || (currentLang === 'gu' ? 'અનામી' : currentLang === 'hi' ? 'गुमनाम' : 'Anonymous')}</span>
                      <span><strong>{riskDetails.ageSexLabel}:</strong> {patientInfo.age}y / {patientInfo.gender}</span>
                    </div>
                    <div className="flex justify-between">
                      <span><strong>{riskDetails.uhidLabel}:</strong> {patientInfo.uhid}</span>
                      <span><strong>SpO2:</strong> {predictionResult.vitalsEvaluated.oxygenSaturation}% | <strong>HR:</strong> {predictionResult.vitalsEvaluated.heartRate} bpm</span>
                    </div>
                    <div className="flex justify-between items-center pt-1">
                      <span><strong>{riskDetails.chiefComplaintLabel}:</strong> {getChiefComplaintLabel(chiefComplaint, currentLang)}</span>
                      <span className={`px-2 py-0.5 rounded font-black text-xs ${
                        predictionResult.riskCategory === 'High' ? 'bg-red-100 text-red-800 border border-red-300' : predictionResult.riskCategory === 'Medium' ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      }`}>
                        {riskDetails.riskBadgeLabel}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200 flex justify-between items-end text-[10px] text-slate-600">
                    <div>
                      <p className="font-bold text-slate-800">{riskDetails.attendingMOLabel}: {clinicProfile.doctorInCharge}</p>
                      <p className="text-[9px] text-slate-500">{clinicProfile.doctorDegree}</p>
                    </div>
                    <div className="text-right">
                      <div className="w-24 h-6 border border-dashed border-slate-300 rounded mb-0.5 flex items-center justify-center text-[8px] text-slate-400">
                        {riskDetails.doctorSealLabel}
                      </div>
                      <span className="text-[9px] text-slate-500">{riskDetails.signStampLabel}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => window.print()}
                  className="w-full py-3 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow transition cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  {riskDetails.printSlipButton}
                </button>

                <button
                  onClick={() => setActiveTab('doctor_station')}
                  className="w-full py-3 bg-gradient-to-r from-teal-800 to-teal-900 hover:from-teal-700 hover:to-teal-800 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-md transition cursor-pointer"
                >
                  <Stethoscope className="w-4 h-4 text-teal-300" />
                  {riskDetails.openDoctorStationButton}
                </button>

                <button
                  onClick={handleReset}
                  className="w-full py-3 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" />
                  {riskDetails.intakeNextButton}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
        </div>
      )}
    </div>
  );
}
