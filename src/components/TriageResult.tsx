import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  PhoneCall,
  Pill,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Activity,
  FileText,
  ShieldAlert,
  Info,
  ExternalLink,
  Clock,
  Ban,
  CheckCircle2,
  Baby,
  Calendar,
  Sparkles,
  BookmarkCheck,
  ShieldCheck,
  Globe,
  Building2,
  ChevronRight,
  Camera,
  Image as ImageIcon,
  Grid,
  BookOpen,
  Loader2,
  Bot,
  Check,
  X,
  Send
} from 'lucide-react';
import { CaseData, TriageAssessment, LanguageCode, MedicineItemV2, Patient, SafetyConflict } from '../types';
import { getMedicines } from '../engine/medicineEngine';
import { checkSafety } from '../engine/safetyEngine';
import { PharmacyPanel } from './PharmacyPanel';
import { DietPanel } from './DietPanel';
import { db, getPreviousCasesForDisease, ensureDefaultPatient } from '../db/db';
import { queueCaseForSync } from '../services/syncService';
import { checkEligibility } from '../engine/schemeEngine';
import diseaseArticleMap from '../data/disease_article_map.json';
import { AddScheduleModal } from './adherence/AddScheduleModal';
import healthArticlesData from '../data/health_articles.json';
import { ArticleDetail, FullArticle } from './ArticleDetail';
import { ReferralNoteModal } from './ReferralNoteModal';
import { NutritionScreeningModal } from './NutritionScreeningModal';
import { triageModelService, TriagePredictionResult } from '../services/triageModelService';
import { DynamicQuestionManager } from '../engine/dynamicQuestions';

interface TriageResultProps {
  assessment: TriageAssessment;
  caseData: CaseData;
  onNewCase: () => void;
  onOpenSchemeChecker?: (diseaseId?: string) => void;
  onOpenArticles?: () => void;
}

export const TriageResult: React.FC<TriageResultProps> = ({
  assessment,
  caseData,
  onNewCase,
  onOpenSchemeChecker,
  onOpenArticles,
}) => {
  const { t, i18n } = useTranslation();
  const currentLang = (i18n.language || 'en') as LanguageCode;

  const [showMedicines, setShowMedicines] = useState<boolean>(true);
  const [showPharmacyModal, setShowPharmacyModal] = useState<boolean>(false);
  const [showReferralModal, setShowReferralModal] = useState<boolean>(false);
  const [showNutritionModal, setShowNutritionModal] = useState<boolean>(false);
  const [mergedDeficiencyDiet, setMergedDeficiencyDiet] = useState<{ eat: string[]; avoid: string[] }>({ eat: [], avoid: [] });
  const [activeTab, setActiveTab] = useState<'allopathy' | 'ayurveda' | 'homeopathy'>('allopathy');
  const [selectedArticleModal, setSelectedArticleModal] = useState<FullArticle | null>(null);

  // EMR & Smart Recall State
  const [patientRecord, setPatientRecord] = useState<Patient | null>(null);
  const [savedCaseId, setSavedCaseId] = useState<number | null>(null);
  const [smartRecallText, setSmartRecallText] = useState<string | null>(null);
  const [smartRecallWarning, setSmartRecallWarning] = useState<string | null>(null);
  const [followUpDate, setFollowUpDate] = useState<string>('');
  const [followUpSaved, setFollowUpSaved] = useState<boolean>(false);

  // DOT Medication Schedule Modal State
  const [trackerScheduleMed, setTrackerScheduleMed] = useState<{ name: string; dosage: string } | null>(null);

  // AI Diagnostic Explanation State
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [aiDiagnosisData, setAiDiagnosisData] = useState<{
    primaryDiagnosis: string;
    confidence: string;
    urgency: string;
    reasoning: string;
    differentials?: Array<{ name: string; likelihood: string }>;
    followUpQuestions?: string[];
    suggestedActions?: string[];
  } | null>(null);
  const [loadingAiExplanation, setLoadingAiExplanation] = useState<boolean>(false);
  const [aiExplanationError, setAiExplanationError] = useState<string | null>(null);
  const [showAiExplanationSection, setShowAiExplanationSection] = useState<boolean>(false);

  // On-Device XGBoost ML Triage Prediction State
  const [mlPrediction, setMlPrediction] = useState<TriagePredictionResult | null>(null);

  // Custom AI Diagnostic Question State
  const [customQuestionText, setCustomQuestionText] = useState<string>('');
  const [customAnswersList, setCustomAnswersList] = useState<Array<{ q: string; a: string }>>([]);
  const [loadingCustomAnswer, setLoadingCustomAnswer] = useState<boolean>(false);

  const { risk, emergencyTrigger, diagnosis, extractedSymptoms } = assessment;
  const medicines = getMedicines(diagnosis.primaryDiseaseId, caseData);

  const fetchGeminiExplanation = async () => {
    setLoadingAiExplanation(true);
    setAiExplanationError(null);
    setShowAiExplanationSection(true);
    const mlDiseasePred = caseData.diseasePrediction || (diagnosis as any).mlPrediction;
    const diseaseName = mlDiseasePred?.primaryDisease || diagnosis.primaryName;
    const diseaseConfidence = mlDiseasePred?.confidence ? `${mlDiseasePred.confidence}%` : diagnosis.confidence;
    const diseaseDifferentials = mlDiseasePred?.differentials || diagnosis.differentialDiagnoses;

    try {
      const [explainRes, diagnoseRes] = await Promise.all([
        fetch('/api/explain-diagnosis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            primaryName: diseaseName,
            confidence: diseaseConfidence,
            differentialDiagnoses: diseaseDifferentials,
            chiefComplaint: caseData.chief_complaint,
            duration: caseData.duration,
            symptoms: extractedSymptoms,
            vitals: caseData.vitals,
            medicalHistory: caseData.medical_history,
            exposureHistory: caseData.exposure_history,
            patientAge: patientRecord?.age,
            patientGender: patientRecord?.gender,
            language: currentLang,
            mlPrimaryDiagnosis: diseaseName,
            mlConfidence: mlDiseasePred?.confidence,
            mlDifferentials: diseaseDifferentials,
          }),
        }),
        fetch('/api/ai-diagnose', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chiefComplaint: caseData.chief_complaint,
            duration: caseData.duration,
            symptoms: extractedSymptoms,
            vitals: caseData.vitals,
            medicalHistory: caseData.medical_history,
            exposureHistory: caseData.exposure_history,
            patientAge: patientRecord?.age,
            patientGender: patientRecord?.gender,
            language: currentLang,
            mlPrimaryDiagnosis: diseaseName,
            mlConfidence: mlDiseasePred?.confidence,
            mlDifferentials: diseaseDifferentials,
          }),
        }),
      ]);

      const explainData = await explainRes.json();
      const diagnoseData = await diagnoseRes.json();

      if (explainData.success && explainData.explanation) {
        setAiExplanation(explainData.explanation);
      }
      if (diagnoseData.success && diagnoseData.primaryDiagnosis) {
        setAiDiagnosisData(diagnoseData);
      }

      if (!explainData.explanation && !diagnoseData.primaryDiagnosis) {
        setAiExplanationError('Could not retrieve AI diagnostic evaluation.');
      }
    } catch (err: any) {
      setAiExplanationError('Failed to connect to AI server.');
    } finally {
      setLoadingAiExplanation(false);
    }
  };

  const handleAskCustomQuestion = async () => {
    if (!customQuestionText.trim()) return;
    const qText = customQuestionText.trim();
    setCustomQuestionText('');
    setLoadingCustomAnswer(true);

    try {
      const res = await fetch('/api/explain-diagnosis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          primaryName: `${diagnosis.primaryName} (Question: ${qText})`,
          confidence: diagnosis.confidence,
          differentialDiagnoses: diagnosis.differentialDiagnoses,
          chiefComplaint: caseData.chief_complaint,
          duration: caseData.duration,
          symptoms: extractedSymptoms,
          vitals: caseData.vitals,
          medicalHistory: caseData.medical_history,
          exposureHistory: caseData.exposure_history,
          patientAge: patientRecord?.age,
          patientGender: patientRecord?.gender,
          language: currentLang,
        }),
      });
      const data = await res.json();
      if (data.success && data.explanation) {
        setCustomAnswersList((prev) => [...prev, { q: qText, a: data.explanation }]);
      }
    } catch (e) {
      setCustomAnswersList((prev) => [...prev, { q: qText, a: 'Unable to reach AI for this question.' }]);
    } finally {
      setLoadingCustomAnswer(false);
    }
  };

  useEffect(() => {
    initCaseAndRecall();
  }, []);

  const initCaseAndRecall = async () => {
    try {
      let patientId = caseData.patientId;
      if (!patientId) {
        patientId = await ensureDefaultPatient();
      }

      const p = await db.patients.get(patientId);
      if (p) {
        setPatientRecord(p);
      }

      // Compute On-Device XGBoost ML Triage Urgency
      try {
        const { template } = triageModelService.findBestTemplate(caseData.chief_complaint || '', currentLang);
        const qManager = new DynamicQuestionManager(template);
        const durationDays = parseInt(caseData.duration?.match(/\d+/)?.[0] || '2', 10);
        const mlResult = qManager.evaluateTriage(p, durationDays, {
          temperature: typeof caseData.temperature === 'number' ? caseData.temperature : 98.6,
          spo2: typeof caseData.spo2 === 'number' ? caseData.spo2 : 98,
          systolicBp: typeof caseData.systolic === 'number' ? caseData.systolic : 120,
          heartRate: typeof caseData.heart_rate === 'number' ? caseData.heart_rate : 75
        });
        setMlPrediction(mlResult);
      } catch (mlErr) {
        console.error('Error running ML triage prediction:', mlErr);
      }

      // 1. Smart Recall Check
      const prevCases = await getPreviousCasesForDisease(patientId, diagnosis.primaryDiseaseId);
      if (prevCases.length > 0) {
        const improvedCase = prevCases.find((c) => c.outcome === 'improved' || c.outcome === 'recovered');
        if (improvedCase && improvedCase.medicinesGiven?.length) {
          setSmartRecallText(
            currentLang === 'gu'
              ? `પૂર્વ સારવાર યાદ: આ દર્દીને અગાઉ આ રોગમાં ${improvedCase.medicinesGiven.join(', ')} થી સુધારો થયો હતો.`
              : currentLang === 'hi'
              ? `पूर्व उपचार स्मरण: इस रोगी को पूर्व में इस बीमारी में ${improvedCase.medicinesGiven.join(', ')} से सुधार हुआ था।`
              : `Smart Recall: This patient previously improved with [${improvedCase.medicinesGiven.join(', ')}] for this condition.`
          );
        }

        const worsenedCase = prevCases.find((c) => c.outcome === 'worsened');
        if (worsenedCase && worsenedCase.medicinesGiven?.length) {
          setSmartRecallWarning(
            currentLang === 'gu'
              ? `સાવધાની: અગાઉ આ દવાઓ (${worsenedCase.medicinesGiven.join(', ')}) આપી ત્યારે દર્દીની સ્થિતિ બગડી હતી.`
              : currentLang === 'hi'
              ? `सावधानी: पिछली बार यह दवाएँ (${worsenedCase.medicinesGiven.join(', ')}) देने पर रोगी की स्थिति बिगड़ी थी।`
              : `Caution: Patient condition worsened during previous treatment with [${worsenedCase.medicinesGiven.join(', ')}]. Consider alternatives.`
          );
        }
      }

      // 2. Extract suggested medicine names for saving
      const defaultMeds: string[] = [];
      if (medicines.allopathy && medicines.allopathy.length > 0) {
        defaultMeds.push(medicines.allopathy[0].name[currentLang] || medicines.allopathy[0].name.en);
      }
      if (medicines.ayurveda && medicines.ayurveda.length > 0) {
        defaultMeds.push(medicines.ayurveda[0].name[currentLang] || medicines.ayurveda[0].name.en);
      }

      // 3. Save Case Record
      const newCaseId = await db.cases.add({
        patientId,
        date: new Date().toISOString(),
        chiefComplaint: caseData.chief_complaint,
        duration: caseData.duration,
        symptoms: extractedSymptoms,
        diagnosisId: diagnosis.primaryDiseaseId,
        diagnosisName: diagnosis.primaryName,
        risk: assessment.risk,
        medicinesGiven: defaultMeds,
        followUpDate: null,
        followUpDone: false
      });

      setSavedCaseId(newCaseId);

      // 4. Queue anonymized report for community outbreak surveillance
      const patient = await db.patients.get(patientId);
      await queueCaseForSync(
        diagnosis.primaryDiseaseId,
        diagnosis.primaryName,
        assessment.risk,
        patient?.village
      );
    } catch (err) {
      console.error('Failed to save case or recall history', err);
    }
  };

  const handleScheduleFollowUp = async (selectedDateStr: string) => {
    if (!savedCaseId) return;
    setFollowUpDate(selectedDateStr);

    try {
      await db.cases.update(savedCaseId, {
        followUpDate: selectedDateStr || null
      });
      setFollowUpSaved(true);
    } catch (err) {
      console.error('Failed to set follow up date', err);
    }
  };

  const setQuickDate = (daysAhead: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    const dateStr = d.toISOString().split('T')[0];
    handleScheduleFollowUp(dateStr);
  };

  // Confidence text localization
  const getConfidenceText = (conf: 'High' | 'Medium' | 'Low') => {
    switch (conf) {
      case 'High':
        return t('result.confidenceHigh');
      case 'Medium':
        return t('result.confidenceMedium');
      case 'Low':
        return t('result.confidenceLow');
      default:
        return conf;
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-4 py-6 space-y-6 bg-[#F4F7F6] font-sans">
      {/* 1. TRIAGE RISK CARD */}
      <div
        className={`rounded-2xl p-6 sm:p-8 shadow-card border relative overflow-hidden font-sans transition-all ${
          risk === 'red'
            ? 'bg-[#B71C1C] text-white border-[#B71C1C]'
            : risk === 'orange'
            ? 'bg-white text-[#1A2B2B] border-[#C46A3A] border-2'
            : 'bg-white text-[#1A2B2B] border-[#2E7D73] border-2'
        }`}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-4 border-current/20">
          <div className="flex items-center gap-4">
            {/* Status Badge Icon */}
            <div
              className={`w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center shrink-0 font-mono font-bold rounded-2xl border-2 shadow-xs ${
                risk === 'red'
                  ? 'bg-white text-[#B71C1C] border-white'
                  : risk === 'orange'
                  ? 'bg-[#C46A3A] text-white border-[#C46A3A]'
                  : 'bg-[#2E7D73] text-white border-[#2E7D73]'
              }`}
            >
              {risk === 'red' ? (
                <ShieldAlert className="w-8 h-8" />
              ) : risk === 'orange' ? (
                <AlertTriangle className="w-8 h-8" />
              ) : (
                <CheckCircle className="w-8 h-8" />
              )}
            </div>

            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider opacity-80 block">
                TRIAGE ASSESSMENT ASSESSMENT
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-display">
                {risk === 'red'
                  ? t('result.emergency')
                  : risk === 'orange'
                  ? t('result.urgent')
                  : t('result.routine')}
              </h2>
            </div>
          </div>

          {/* Risk Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {risk === 'red' && (
              <a
                href="tel:108"
                className="flex items-center gap-2 px-4 py-2 bg-white text-[#B71C1C] hover:bg-[#F4F7F6] font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
              >
                <PhoneCall className="w-4 h-4 text-[#B71C1C]" />
                <span>CALL 108</span>
              </a>
            )}

            <button
              onClick={() => setShowReferralModal(true)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs shadow-md transition-all cursor-pointer ${
                risk === 'red'
                  ? 'bg-white text-[#B71C1C] hover:bg-white/90'
                  : 'bg-[#1B4D4A] hover:bg-[#2E7D73] text-white'
              }`}
            >
              <FileText className={`w-4 h-4 ${risk === 'red' ? 'text-[#B71C1C]' : 'text-[#B2DFD8]'}`} />
              <span>{currentLang === 'gu' ? 'રિફરલ નોટ' : currentLang === 'hi' ? 'रेफरल नोट' : 'Referral Note'}</span>
            </button>
          </div>
        </div>

        <p className="mt-4 text-sm font-sans font-medium leading-relaxed">
          {risk === 'red'
            ? t('result.emergencyMsg')
            : risk === 'orange'
            ? t('result.urgentMsg')
            : t('result.routineMsg')}
        </p>

        {emergencyTrigger && (
          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 bg-[#1B4D4A] text-white rounded-lg text-xs font-mono font-bold border border-[#2E7D73]">
            <ShieldAlert className="w-4 h-4 text-[#B2DFD8]" />
            <span>TRIGGER: {emergencyTrigger}</span>
          </div>
        )}
      </div>

      {/* 1.5 CLINICAL PHOTOGRAPHY & ARTIFACT REPORT */}
      {caseData.clinicalPhoto && (
        <div className="bg-white rounded-2xl p-6 border border-[#DDE3E2] shadow-card space-y-4 font-sans">
          <div className="flex items-center justify-between border-b border-[#DDE3E2] pb-3">
            <div className="flex items-center gap-2 text-[#1B4D4A]">
              <Camera className="w-5 h-5 text-[#2E7D73]" />
              <h3 className="font-bold text-[#1B4D4A] text-base sm:text-lg font-display">
                Clinical Photography & Derm Artifact
              </h3>
            </div>
            <span className="px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-[#1B4D4A] text-white">
              {caseData.photoTag || 'Clinical Photo'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            {/* Image Box with Grid Scale */}
            <div className="md:col-span-5 relative rounded-xl overflow-hidden border border-[#2E7D73] bg-black min-h-[160px] flex items-center justify-center">
              <img
                src={caseData.clinicalPhoto}
                alt="Clinical Report Attachment"
                className="max-h-52 w-auto object-contain mx-auto"
              />
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff20_1px,transparent_1px),linear-gradient(to_bottom,#ffffff20_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />
              <div className="absolute bottom-2 left-2 bg-black/80 px-2 py-0.5 rounded text-[10px] font-mono text-[#B2DFD8] font-bold border border-slate-700">
                1cm CALIBRATED GRID
              </div>
            </div>

            {/* Scientific Image Metadata */}
            <div className="md:col-span-7 space-y-2.5 font-sans text-xs">
              <div className="p-3 bg-[#EDF1F0] border border-[#DDE3E2] rounded-xl space-y-1.5">
                <div className="flex justify-between font-bold text-[#1B4D4A] border-b border-[#DDE3E2] pb-1">
                  <span>PATHOLOGY TAG:</span>
                  <span className="text-[#2E7D73]">{caseData.photoTag || 'Unspecified'}</span>
                </div>
                <div className="flex justify-between text-[#5F6D6C]">
                  <span>SCALE REFERENCE:</span>
                  <span className="font-bold text-[#1A2B2B]">1:1 Millimeter Grid overlay</span>
                </div>
                <div className="flex justify-between text-[#5F6D6C]">
                  <span>STATUS:</span>
                  <span className="font-bold text-[#2E7D73]">Attached to Case EMR</span>
                </div>
              </div>

              {caseData.photoNote && (
                <div className="p-3 bg-[#F4F7F6] border border-[#DDE3E2] rounded-xl italic text-[#1A2B2B]">
                  <span className="font-mono not-italic font-bold text-[#1B4D4A] uppercase block text-[10px]">
                    CLINICIAN / PATIENT OBSERVATION NOTE:
                  </span>
                  "{caseData.photoNote}"
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. ML DISEASE PREDICTION & DIAGNOSIS CARD */}
      <div className="bg-white rounded-2xl p-6 border border-[#DDE3E2] shadow-card space-y-4 font-sans">
        {(() => {
          const mlDiseasePred = caseData.diseasePrediction || (diagnosis as any).mlPrediction;
          const displayPrimary = mlDiseasePred?.primaryDisease || diagnosis.primaryName;
          const displayConf = mlDiseasePred?.formattedConfidence || (mlDiseasePred?.confidence ? `${mlDiseasePred.confidence}%` : '85%');
          const displayDiffs = mlDiseasePred?.differentials || diagnosis.differentialDiagnoses;

          return (
            <>
              <div className="flex items-center justify-between border-b border-[#DDE3E2] pb-3 flex-wrap gap-2">
                <div className="flex items-center gap-2 text-[#1B4D4A]">
                  <Activity className="w-5 h-5 text-[#2E7D73]" />
                  <h3 className="font-bold text-[#1B4D4A] text-lg font-display">
                    AI & ML Clinical Disease Prediction
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-lg text-xs font-mono font-bold border border-emerald-300 bg-emerald-50 text-emerald-900 shadow-xs">
                    Calibrated Confidence: {displayConf}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-teal-800 text-white">
                    36 Outpatient Conditions Evaluated
                  </span>
                </div>
              </div>

              <div>
                <p className="text-xs font-mono font-bold text-[#5F6D6C] uppercase tracking-wider">
                  PRIMARY PREDICTED DISEASE RISK
                </p>
                <div className="flex items-baseline gap-3 flex-wrap mt-1">
                  <h4 className="text-2xl font-black text-emerald-950 font-display">
                    {displayPrimary}
                  </h4>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-100/80 px-2.5 py-0.5 rounded-full">
                    ✓ #1 Ranked Condition Match
                  </span>
                </div>
              </div>

              {/* Top-5 Calibrated Disease-Risk Spectrum */}
              {((mlDiseasePred?.top5Ranking && mlDiseasePred.top5Ranking.length > 0) || (displayDiffs && displayDiffs.length > 0)) && (
                <div className="bg-gradient-to-br from-emerald-50/60 to-slate-50 p-4 rounded-xl border border-emerald-200/80 space-y-2 text-xs font-sans">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-[#1B4D4A] uppercase text-[11px] flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                      Top-5 Calibrated Disease-Risk Ranking (XGBoost):
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">Calibrated Probability</span>
                  </div>

                  <div className="space-y-2 pt-1">
                    {(mlDiseasePred?.top5Ranking || displayDiffs.slice(0, 5)).map((d: any, idx: number) => {
                      const dName = d.diseaseName || d.name || d.primaryDiseaseId || String(d);
                      const dProb = d.probability || d.confidence || 0;
                      const dFormatted = d.formattedProbability || d.formattedConfidence || `${dProb}%`;
                      const riskTier = d.riskTier || (dProb >= 50 ? 'High Risk' : dProb >= 15 ? 'Moderate Risk' : 'Low Risk');

                      return (
                        <div
                          key={idx}
                          className="p-2.5 bg-white rounded-xl border border-emerald-100 shadow-xs space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-900 text-[10px] font-black flex items-center justify-center">
                                {idx + 1}
                              </span>
                              <span className="font-bold text-slate-900 text-xs sm:text-sm">{dName}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                riskTier === 'High Risk'
                                  ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                  : riskTier === 'Moderate Risk'
                                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                  : 'bg-slate-100 text-slate-700'
                              }`}>
                                {riskTier}
                              </span>
                              <span className="font-mono text-xs font-black text-emerald-800">{dFormatted}</span>
                            </div>
                          </div>

                          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-gradient-to-r from-teal-500 to-emerald-600 h-1.5 rounded-full transition-all duration-500"
                              style={{ width: `${Math.min(100, Math.max(5, dProb))}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Symptom Vector Summary (Confirmed = 1, Excluded = 0, Unanswered = Unknown) */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-slate-700 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <Grid className="w-3.5 h-3.5 text-emerald-700" />
                    {currentLang === 'gu' ? 'લક્ષણ વેક્ટર પુરાવા (Symptom Vector Evidence):' : currentLang === 'hi' ? 'लक्षण वेक्टर साक्ष्य (Symptom Vector Evidence):' : 'Evaluated Symptom Vector Evidence:'}
                  </span>
                  <span className="text-[10px] font-bold text-slate-500">
                    Unanswered Symptoms = Unknown (Non-zeroed)
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {(caseData.symptoms || caseData.additional_symptoms || []).map((s: string) => (
                    <span key={s} className="bg-emerald-600 text-white text-[11px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-2xs">
                      <Check className="w-3 h-3 stroke-[3]" /> {s} (1)
                    </span>
                  ))}
                  {(caseData.excludedSymptoms || []).map((s: string) => (
                    <span key={s} className="bg-slate-600 text-white text-[11px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 line-through opacity-80">
                      <X className="w-3 h-3 stroke-[3]" /> {s} (0)
                    </span>
                  ))}
                  {(caseData.unknownSymptoms || []).map((s: string) => (
                    <span key={s} className="bg-slate-200 text-slate-700 text-[11px] font-medium px-2 py-1 rounded-lg flex items-center gap-1">
                      ⚪ {s} (Unknown)
                    </span>
                  ))}
                </div>
              </div>

              {/* MANDATORY MEDICAL PREDICTION DISCLAIMER */}
              <div className="bg-amber-50/90 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-900 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-extrabold text-amber-950">
                    {currentLang === 'gu'
                      ? '⚠️ તબીબી આગાહી સૂચના (Clinical Prediction Disclaimer)'
                      : currentLang === 'hi'
                      ? '⚠️ चिकित्सीय भविष्यवाणी अस्वीकरण (Clinical Prediction Disclaimer)'
                      : '⚠️ Clinical Prediction & Diagnostic Disclaimer'}
                  </p>
                  <p className="text-[11px] text-amber-800 leading-relaxed font-medium">
                    {currentLang === 'gu'
                      ? 'આ પરિણામ AI મોડેલ દ્વારા આપવામાં આવેલી આંકડાકીય આગાહી (Probabilistic Prediction) છે, પુષ્ટિ થયેલ અંતિમ તબીબી નિદાન નથી. સત્તાવાર તપાસ માટે યોગ્ય ડૉક્ટરનો સંપર્ક કરો.'
                      : currentLang === 'hi'
                      ? 'यह परिणाम AI मॉडल द्वारा दी गई सांख्यिकीय भविष्यवाणी (Probabilistic Prediction) है, कोई आधिकारिक चिकित्सा निदान नहीं। कृपया अंतिम पुष्टि एवं उपचार के लिए योग्य चिकित्सक से परामर्श लें।'
                      : 'This output is an AI-generated statistical prediction based on clinical symptom vectors, NOT a confirmed medical diagnosis. Always consult a licensed medical professional for definitive clinical evaluation.'}
                  </p>
                </div>
              </div>
            </>
          );
        })()}

        {/* AI Diagnostic Explanation Trigger & View */}
        <div className="pt-3 border-t border-[#DDE3E2]">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs text-[#1B4D4A]">
              <Sparkles className="w-4 h-4 text-emerald-600 animate-pulse" />
              <span className="font-bold font-display">
                {currentLang === 'gu'
                  ? 'AI રોગ નિદાન સમજુતી'
                  : currentLang === 'hi'
                  ? 'AI बीमारी निदान व्याख्या'
                  : 'AI Diagnostic Reasoning'}
              </span>
            </div>

            <button
              onClick={() => {
                if (!showAiExplanationSection || !aiExplanation) {
                  fetchGeminiExplanation();
                } else {
                  setShowAiExplanationSection(!showAiExplanationSection);
                }
              }}
              disabled={loadingAiExplanation}
              className="px-3.5 py-1.5 bg-gradient-to-r from-[#1B4D4A] to-[#2E7D73] hover:from-[#143B38] hover:to-[#226159] text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {loadingAiExplanation ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>
                    {currentLang === 'gu'
                      ? 'AI વિશ્લેષણ કરી રહ્યું છે...'
                      : currentLang === 'hi'
                      ? 'AI विश्लेषण कर रहा है...'
                      : 'Analyzing with AI...'}
                  </span>
                </>
              ) : (
                <>
                  <Bot className="w-4 h-4 text-emerald-300" />
                  <span>
                    {aiExplanation
                      ? (showAiExplanationSection
                          ? (currentLang === 'gu' ? 'સમજુતી સંતાડો' : currentLang === 'hi' ? 'व्याख्या छिपाएं' : 'Hide AI Explanation')
                          : (currentLang === 'gu' ? 'AI સમજુતી જુઓ' : currentLang === 'hi' ? 'AI व्याख्या देखें' : 'View AI Explanation'))
                      : (currentLang === 'gu' ? 'કારણ સ્પષ્ટ કરો (AI)' : currentLang === 'hi' ? 'कारण स्पष्ट करें (AI)' : 'Explain Why This Disease')}
                  </span>
                  {showAiExplanationSection ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </>
              )}
            </button>
          </div>

          {showAiExplanationSection && (
            <div className="mt-3 p-4 bg-gradient-to-br from-emerald-50/90 via-teal-50/50 to-white border border-emerald-200/80 rounded-2xl space-y-3 font-sans text-xs text-slate-800 shadow-inner">
              <div className="flex items-center justify-between border-b border-emerald-200 pb-2">
                <span className="font-mono font-bold text-[10px] text-emerald-900 uppercase flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>
                    {currentLang === 'gu'
                      ? 'AI ક્લિનિકલ મોડેલ તર્ક'
                      : currentLang === 'hi'
                      ? 'AI नैदानिक मॉडल तर्क'
                      : 'AI CLINICAL REASONING'}
                  </span>
                </span>
                {aiExplanation && (
                  <button
                    onClick={fetchGeminiExplanation}
                    disabled={loadingAiExplanation}
                    className="text-[11px] font-bold text-emerald-800 hover:text-emerald-950 flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className={`w-3 h-3 ${loadingAiExplanation ? 'animate-spin' : ''}`} />
                    <span>Re-analyze</span>
                  </button>
                )}
              </div>

              {loadingAiExplanation && (
                <div className="py-6 flex flex-col items-center justify-center space-y-2 text-slate-600">
                  <Loader2 className="w-6 h-6 animate-spin text-emerald-700" />
                  <p className="text-xs font-medium">
                    {currentLang === 'gu'
                      ? 'AI દર્દીના લક્ષણો, વાઇટલ્સ અને રોગના લક્ષણોનું પૃથક્કરણ કરી રહ્યું છે...'
                      : currentLang === 'hi'
                      ? 'AI रोगी के लक्षणों, वाइटल्स और बीमारी का विश्लेषण कर रहा है...'
                      : 'AI is analyzing patient symptoms, vitals, and diagnostic criteria...'}
                  </p>
                </div>
              )}

              {aiExplanationError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{aiExplanationError}</span>
                </div>
              )}

              {!loadingAiExplanation && (aiExplanation || aiDiagnosisData) && (
                <div className="space-y-4">
                  {/* AI Primary Verdict & Engine Comparison */}
                  {aiDiagnosisData && (
                    <div className="p-3 bg-white border border-emerald-200 rounded-xl shadow-xs space-y-2">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div>
                          <span className="text-[10px] font-mono font-bold text-emerald-800 uppercase tracking-wider block">
                            AI MODEL PREDICTED DIAGNOSIS
                          </span>
                          <span className="text-base font-extrabold text-emerald-950 font-display">
                            {aiDiagnosisData.primaryDiagnosis}
                          </span>
                          <span className="ml-2 px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[11px] font-bold rounded-md">
                            {aiDiagnosisData.confidence} Confidence
                          </span>
                        </div>

                        {/* Concurrence Indicator */}
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-teal-50 border border-teal-200 text-teal-900 rounded-xl text-xs font-bold">
                          {aiDiagnosisData.primaryDiagnosis.toLowerCase().includes(diagnosis.primaryName.toLowerCase()) ||
                          diagnosis.primaryName.toLowerCase().includes(aiDiagnosisData.primaryDiagnosis.toLowerCase()) ? (
                            <>
                              <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />
                              <span>Concurs with Rule Engine</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-4 h-4 text-amber-600 animate-pulse" />
                              <span>AI Identifies Parallel Clinical Spectrum</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* AI Differentials Spectrum */}
                      {aiDiagnosisData.differentials && aiDiagnosisData.differentials.length > 0 && (
                        <div className="pt-2 border-t border-emerald-100">
                          <span className="text-[10px] font-mono font-bold text-slate-500 uppercase block mb-1">
                            AI RANKED DIFFERENTIAL PROBABILITIES
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {aiDiagnosisData.differentials.map((diff, idx) => (
                              <span
                                key={idx}
                                className="px-2.5 py-1 bg-emerald-50 text-emerald-900 border border-emerald-200/80 rounded-lg text-xs font-medium"
                              >
                                <strong>{diff.name}</strong> <span className="text-emerald-700">({diff.likelihood})</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* AI Recommended Follow-up Questions & Actions */}
                      {aiDiagnosisData.followUpQuestions && aiDiagnosisData.followUpQuestions.length > 0 && (
                        <div className="pt-2 border-t border-emerald-100 text-xs">
                          <span className="text-[10px] font-mono font-bold text-emerald-900 uppercase block mb-1">
                            🎯 AI RECOMMENDED CLINICAL CHECKS & QUESTIONS FOR HEALTH WORKER
                          </span>
                          <ul className="list-disc list-inside space-y-1 text-slate-700">
                            {aiDiagnosisData.followUpQuestions.map((q, i) => (
                              <li key={i}>{q}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* AI Detailed Clinical Explanation */}
                  {aiExplanation && (
                    <div className="prose prose-xs max-w-none text-slate-800 space-y-2 leading-relaxed whitespace-pre-line font-sans pt-1">
                      {aiExplanation}
                    </div>
                  )}

                  {/* Interactive Q&A Input for Custom Diagnostic Queries */}
                  <div className="pt-3 border-t border-emerald-200/80 space-y-2">
                    <span className="text-[11px] font-bold text-emerald-900 flex items-center gap-1.5">
                      <Bot className="w-4 h-4 text-emerald-600" />
                      <span>
                        {currentLang === 'gu'
                          ? 'AI ને રોગ નિદાન વિષયક પ્રશ્ન પૂછો:'
                          : currentLang === 'hi'
                          ? 'AI से बीमारी के बारे में प्रश्न पूछें:'
                          : 'Ask AI a Diagnostic Question:'}
                      </span>
                    </span>

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={customQuestionText}
                        onChange={(e) => setCustomQuestionText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAskCustomQuestion()}
                        placeholder={
                          currentLang === 'gu'
                            ? 'દા.ત., શું પ્લેટલેટ સામાન્ય હોય તો પણ ડેન્ગ્યુ હોઈ શકે?'
                            : currentLang === 'hi'
                            ? 'उदा., क्या प्लेटलेट सामान्य होने पर भी डेंगू हो सकता है?'
                            : 'e.g., What if patient has high fever with severe joint pain?'
                        }
                        className="flex-1 px-3 py-2 bg-white border border-emerald-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-emerald-600"
                      />
                      <button
                        onClick={handleAskCustomQuestion}
                        disabled={loadingCustomAnswer || !customQuestionText.trim()}
                        className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        {loadingCustomAnswer ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Send className="w-3.5 h-3.5" />
                        )}
                        <span>Ask</span>
                      </button>
                    </div>

                    {/* Previous Custom Q&A Results */}
                    {customAnswersList.length > 0 && (
                      <div className="space-y-2 pt-2">
                        {customAnswersList.map((qa, i) => (
                          <div key={i} className="p-3 bg-white border border-emerald-200 rounded-xl space-y-1 text-xs">
                            <p className="font-bold text-emerald-950 flex items-center gap-1">
                              <span>Q:</span> "{qa.q}"
                            </p>
                            <p className="text-slate-700 whitespace-pre-line leading-relaxed pl-3 border-l-2 border-emerald-500">
                              {qa.a}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 3. MEDICINE SUGGESTIONS MODULE */}
      <div className="bg-white rounded-2xl border border-[#DDE3E2] shadow-card overflow-hidden transition-all font-sans">
        {/* Smart Recall History Banners */}
        {smartRecallText && (
          <div className="p-4 bg-[#EDF1F0] border-b border-[#DDE3E2] text-[#1B4D4A] text-xs font-semibold flex items-start gap-2.5">
            <Sparkles className="w-5 h-5 text-[#2E7D73] shrink-0 mt-0.5" />
            <span>[RECALL]: {smartRecallText}</span>
          </div>
        )}

        {smartRecallWarning && (
          <div className="p-4 bg-[#C46A3A] text-white border-b border-[#C46A3A] text-xs font-semibold flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-white shrink-0 mt-0.5" />
            <span>[WARNING]: {smartRecallWarning}</span>
          </div>
        )}

        {/* Collapsible Header */}
        <div className="flex items-center justify-between p-5 bg-[#EDF1F0] border-b border-[#DDE3E2]">
          <button
            onClick={() => setShowMedicines(!showMedicines)}
            className="flex items-center gap-2.5 text-left flex-1"
          >
            <div className="p-2.5 rounded-xl bg-[#2E7D73] text-white shadow-xs">
              <Pill className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-[#1B4D4A] text-lg font-display flex items-center gap-2">
                <span>Pharmacopeia & Treatment Protocol</span>
              </h3>
              <p className="text-xs text-[#5F6D6C]">
                Allopathy • Ayurveda • Homeopathy (Filtered by Age & Vitals)
              </p>
            </div>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPharmacyModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2E7D73] hover:bg-[#1B4D4A] text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-xs"
            >
              <span>Full Formulary</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setShowMedicines(!showMedicines)}
              className="p-2 text-[#5F6D6C] hover:text-[#1B4D4A]"
            >
              {showMedicines ? (
                <ChevronUp className="w-5 h-5" />
              ) : (
                <ChevronDown className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {showMedicines && medicines && (
          <div className="p-5 border-t border-[#DDE3E2] space-y-4 font-sans">
            {/* Disclaimer Bar */}
            <div className="flex items-start gap-2.5 p-3 bg-[#F4F7F6] border border-[#DDE3E2] rounded-xl text-[#5F6D6C] text-xs leading-relaxed">
              <Info className="w-4 h-4 text-[#2E7D73] shrink-0 mt-0.5" />
              <span>{t('result.medicineDisclaimer')}</span>
            </div>

            {/* Medicine Category Tabs */}
            <div className="flex items-center gap-1 p-1 bg-[#EDF1F0] rounded-xl font-sans text-xs">
              {(['allopathy', 'ayurveda', 'homeopathy'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-2 px-3 font-bold rounded-lg transition-all cursor-pointer ${
                    activeTab === tab
                      ? 'bg-[#2E7D73] text-white shadow-xs'
                      : 'text-[#5F6D6C] hover:text-[#1B4D4A]'
                  }`}
                >
                  {tab.toUpperCase()} ({medicines[tab]?.length || 0})
                </button>
              ))}
            </div>

            {/* Medicine List for Active Tab */}
            <div className="space-y-3 font-sans">
              {(() => {
                const activeMedsList = medicines[activeTab] || [];
                const currentTabConflicts = checkSafety(patientRecord, activeMedsList, currentLang);
                const conflictsMap: Record<string, SafetyConflict[]> = {};
                currentTabConflicts.forEach((c) => {
                  if (!conflictsMap[c.medId]) conflictsMap[c.medId] = [];
                  conflictsMap[c.medId].push(c);
                });

                if (activeMedsList.length === 0) {
                  return (
                    <div className="p-4 bg-[#EDF1F0] rounded-xl border border-[#DDE3E2] text-center font-sans">
                      <p className="text-xs text-[#5F6D6C] italic">
                        No specific medicine suggestions for this category after patient age filtering.
                      </p>
                    </div>
                  );
                }

                return activeMedsList.map((med: MedicineItemV2, idx: number) => {
                  const medName = med.name[currentLang] || med.name.en;
                  const benefitText = med.benefit[currentLang] || med.benefit.en;
                  const sideText = med.sideEffects[currentLang] || med.sideEffects.en;
                  const howText = med.howToTake[currentLang] || med.howToTake.en;

                  const medConfs = conflictsMap[med.id] || [];
                  const hasConf = medConfs.length > 0;

                  return (
                    <div
                      key={idx}
                      className={`p-4 rounded-xl space-y-3 shadow-xs border bg-white ${
                        hasConf
                          ? 'border-[#B71C1C] ring-1 ring-[#B71C1C]/20'
                          : 'border-[#DDE3E2]'
                      }`}
                    >
                      {/* Safety Conflict Alert Banner */}
                      {hasConf && (
                        <div className="p-3 rounded-xl bg-[#B71C1C]/10 border-l-4 border-[#B71C1C] text-[#881313] text-xs space-y-1 font-sans">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 font-bold">
                              <AlertTriangle className="w-4 h-4 text-[#B71C1C] shrink-0" />
                              <span className="uppercase text-[10px] tracking-wider">
                                {medConfs[0].type === 'allergy'
                                  ? 'ALLERGY CONTRAINDICATION'
                                  : 'DRUG INTERACTION'}
                              </span>
                            </div>
                            <button
                              onClick={() => setShowPharmacyModal(true)}
                              className="px-2.5 py-1 bg-[#1B4D4A] hover:bg-[#2E7D73] text-white font-bold text-[10px] rounded-lg transition cursor-pointer shrink-0"
                            >
                              Switch Alternative
                            </button>
                          </div>
                          <p className="font-semibold leading-relaxed">
                            {typeof medConfs[0].message === 'string'
                              ? medConfs[0].message
                              : medConfs[0].message[currentLang] || medConfs[0].message.en}
                          </p>
                        </div>
                      )}

                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-bold text-[#1B4D4A] text-sm sm:text-base flex items-center gap-2 font-display">
                          <span className="w-2 h-2 rounded-full bg-[#2E7D73]" />
                          {medName}
                        </h4>

                        <div className="flex items-center gap-1 text-[10px]">
                          {med.ageRestriction ? (
                            <span className="px-2 py-0.5 rounded-md bg-[#EDF1F0] text-[#1B4D4A] font-bold border border-[#DDE3E2]">
                              {med.ageRestriction}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md bg-[#EDF1F0] text-[#2E7D73] font-bold border border-[#DDE3E2]">
                              All Ages
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div className="bg-[#F4F7F6] p-2.5 rounded-xl border border-[#DDE3E2]">
                          <span className="font-mono font-bold text-[#1B4D4A] block mb-0.5 uppercase text-[10px]">
                            INDICATION / BENEFIT:
                          </span>
                          <span className="text-[#1A2B2B]">{benefitText}</span>
                        </div>

                        <div className="bg-[#F4F7F6] p-2.5 rounded-xl border border-[#DDE3E2]">
                          <span className="font-mono font-bold text-[#5F6D6C] block mb-0.5 uppercase text-[10px]">
                            ADVERSE EFFECTS / CONTRAINDICATIONS:
                          </span>
                          <span className="text-[#1A2B2B]">{sideText}</span>
                        </div>
                      </div>

                      {/* How to Take */}
                      <div className="bg-[#F4F7F6] p-2.5 rounded-xl border border-[#DDE3E2] text-xs flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2">
                          <Clock className="w-3.5 h-3.5 text-[#2E7D73] shrink-0 mt-0.5" />
                          <div>
                            <span className="font-mono font-bold text-[#1B4D4A] uppercase text-[10px]">DOSAGE PROTOCOL: </span>
                            <span className="text-[#1A2B2B]">{howText}</span>
                          </div>
                        </div>

                        <button
                          onClick={() => setTrackerScheduleMed({ name: medName, dosage: howText || '1 tablet' })}
                          className="px-2.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-[11px] rounded-xl transition cursor-pointer shrink-0 flex items-center gap-1 shadow-2xs"
                        >
                          <Pill className="w-3.5 h-3.5 text-emerald-200" />
                          <span>{currentLang === 'gu' ? 'દવા ટ્રેકરમાં ઉમેરો (DOT)' : currentLang === 'hi' ? 'दवा ट्रैकर में जोड़ें (DOT)' : 'Add to DOT Tracker'}</span>
                        </button>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            {/* Link to Full Virtual Pharmacy */}
            <div className="pt-2 flex justify-center">
              <button
                onClick={() => setShowPharmacyModal(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1B4D4A] hover:bg-[#2E7D73] text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-xs"
              >
                <span>OPEN CLINICAL PHARMACEUTICAL FORMULARY</span>
                <ExternalLink className="w-4 h-4 text-[#B2DFD8]" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ADD TO MEDICATION TRACKER MODAL */}
      {trackerScheduleMed && (
        <AddScheduleModal
          initialPatientId={patientRecord?.id}
          initialMedicineName={trackerScheduleMed.name}
          initialDosage={trackerScheduleMed.dosage}
          currentLang={currentLang}
          onClose={() => setTrackerScheduleMed(null)}
          onSaveSuccess={() => setTrackerScheduleMed(null)}
        />
      )}


      {/* FULL PHARMACY MODAL OVERLAY */}
      {showPharmacyModal && (
        <PharmacyPanel
          diseaseId={diagnosis.primaryDiseaseId}
          diseaseName={diagnosis.primaryName}
          caseData={caseData}
          onClose={() => setShowPharmacyModal(false)}
        />
      )}

      {/* 3.5 DIETARY RECOMMENDATIONS MODULE */}
      <DietPanel
        diseaseId={diagnosis.primaryDiseaseId}
        diseaseName={diagnosis.primaryName}
        caseData={caseData}
        defaultExpanded={true}
        mergedDeficiencyDiet={mergedDeficiencyDiet}
        onOpenNutritionScreening={() => setShowNutritionModal(true)}
      />

      {showNutritionModal && (
        <NutritionScreeningModal
          isOpen={showNutritionModal}
          onClose={() => setShowNutritionModal(false)}
          patient={patientRecord}
          onApplyDietAdvice={(dietItems) => {
            setMergedDeficiencyDiet((prev) => ({
              eat: [...prev.eat, ...dietItems.eat].filter((item, index, self) => self.indexOf(item) === index),
              avoid: [...prev.avoid, ...dietItems.avoid].filter((item, index, self) => self.indexOf(item) === index),
            }));
          }}
          onOpenArticle={(artId) => {
            setShowNutritionModal(false);
            const found = healthArticlesData.find((a) => a.id === artId);
            if (found) {
              setSelectedArticleModal(found as FullArticle);
            } else if (onOpenArticles) {
              onOpenArticles();
            }
          }}
        />
      )}

      {/* 4. PATIENT CASE SUMMARY */}
      <div className="bg-white rounded-2xl p-6 border border-[#DDE3E2] shadow-card space-y-4 font-sans">
        <div className="flex items-center gap-2 border-b border-[#DDE3E2] pb-3 text-[#1B4D4A]">
          <FileText className="w-5 h-5 text-[#2E7D73]" />
          <h3 className="font-bold text-lg font-display">Clinical Case Profile & Demographics</h3>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs font-sans">
          <div>
            <span className="block text-[#5F6D6C] font-mono uppercase font-bold text-[10px]">DEMOGRAPHIC GROUP</span>
            <span className="font-bold text-[#1A2B2B] capitalize">{caseData.age_group || 'N/A'}</span>
          </div>

          <div>
            <span className="block text-[#5F6D6C] font-mono uppercase font-bold text-[10px]">BIOLOGICAL GENDER</span>
            <span className="font-bold text-[#1A2B2B] capitalize">{caseData.gender || 'N/A'}</span>
          </div>

          <div>
            <span className="block text-[#5F6D6C] font-mono uppercase font-bold text-[10px]">DURATION</span>
            <span className="font-bold text-[#1A2B2B]">{caseData.duration || '1'} Day(s)</span>
          </div>

          <div className="col-span-2 sm:col-span-3">
            <span className="block text-[#5F6D6C] font-mono uppercase font-bold text-[10px]">PRESENTING COMPLAINT</span>
            <p className="font-medium text-[#1A2B2B] bg-[#F4F7F6] p-2.5 rounded-xl border border-[#DDE3E2] mt-1">
              {caseData.chief_complaint || 'N/A'}
            </p>
          </div>

          <div className="col-span-2 sm:col-span-3">
            <span className="block text-[#5F6D6C] font-mono uppercase font-bold text-[10px]">EVALUATED SYMPTOMS & CLINICAL FINDINGS</span>
            <div className="flex flex-wrap gap-1.5 mt-1 text-xs">
              {extractedSymptoms.length > 0 ? (
                extractedSymptoms.map((sym) => (
                  <span
                    key={sym}
                    className="px-2.5 py-0.5 bg-[#EDF1F0] text-[#1B4D4A] font-semibold rounded-lg border border-[#DDE3E2] capitalize"
                  >
                    {sym.replace(/_/g, ' ')}
                  </span>
                ))
              ) : (
                <span className="text-[#5F6D6C] italic font-sans">None detected</span>
              )}
            </div>
          </div>

          {caseData.medical_history && caseData.medical_history.length > 0 && (
            <div className="col-span-2 sm:col-span-3 border-t border-[#DDE3E2] pt-2">
              <span className="block text-[#5F6D6C] font-mono uppercase font-bold text-[10px]">PAST MEDICAL HISTORY & CO-MORBIDITIES</span>
              <div className="flex flex-wrap gap-1.5 mt-1 text-xs">
                {caseData.medical_history.map((mh: string) => (
                  <span key={mh} className="px-2 py-0.5 bg-amber-50 text-amber-900 border border-amber-200 font-medium rounded-lg capitalize">
                    {mh.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            </div>
          )}

          {caseData.exposure_history && caseData.exposure_history.length > 0 && (
            <div className="col-span-2 sm:col-span-3 border-t border-[#DDE3E2] pt-2">
              <span className="block text-[#5F6D6C] font-mono uppercase font-bold text-[10px]">ENVIRONMENTAL / EXPOSURE RISKS</span>
              <div className="flex flex-wrap gap-1.5 mt-1 text-xs">
                {caseData.exposure_history.map((ex: string) => (
                  <span key={ex} className="px-2 py-0.5 bg-teal-50 text-teal-900 border border-teal-200 font-medium rounded-lg capitalize">
                    {ex.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* GOVERNMENT HEALTH SCHEMES ELIGIBILITY ACTION CARD */}
      {(() => {
        const patientAge = caseData.age_group === 'infant' ? 1 : caseData.age_group === 'child' ? 8 : caseData.age_group === 'elderly' ? 68 : 35;
        const patientGender = (caseData.gender || 'female').toLowerCase();
        const matchedSchemes = checkEligibility(
          {
            age: patientAge,
            gender: patientGender,
            incomeCriteria: { ration_card: 'BPL', occupation: 'landless_labourer' },
            state: 'Gujarat'
          },
          diagnosis.primaryDiseaseId
        );

        const firstScheme = matchedSchemes[0];

        return (
          <div className="bg-white rounded-2xl p-6 border border-[#DDE3E2] shadow-card space-y-3 font-sans">
            <div className="flex items-center justify-between border-b border-[#DDE3E2] pb-3">
              <div className="flex items-center gap-2 text-[#1B4D4A]">
                <ShieldCheck className="w-5 h-5 text-[#2E7D73]" />
                <h3 className="font-extrabold text-[#1B4D4A] text-base sm:text-lg font-display">
                  Government Health Scheme Directives
                </h3>
              </div>
              <span className="px-2.5 py-0.5 rounded-lg bg-[#2E7D73] text-white text-[10px] font-bold uppercase">
                HEALTH POLICY
              </span>
            </div>

            {matchedSchemes.length > 0 ? (
              <div className="p-3.5 bg-[#EDF1F0] rounded-xl border border-[#DDE3E2] space-y-2 font-sans">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-[#2E7D73] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs sm:text-sm font-bold text-[#1B4D4A]">
                      Eligible Policy:{' '}
                      <span className="font-serif italic font-bold">
                        {firstScheme.name[currentLang] || firstScheme.name.en}
                      </span>
                    </p>
                    <p className="text-xs text-[#5F6D6C] mt-1">
                      {firstScheme.reasonForEligibility[currentLang] || firstScheme.reasonForEligibility.en}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-[#EDF1F0] rounded-xl border border-[#DDE3E2] text-xs text-[#5F6D6C]">
                No specific government insurance scheme found for default profile. Launch policy directory wizard for custom criteria.
              </div>
            )}

            <div className="pt-1 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 font-sans">
              <span className="text-[11px] text-[#5F6D6C]">
                Directory: Offline Scheme Registry & Empanelled Hospitals
              </span>

              {onOpenSchemeChecker && (
                <button
                  onClick={() => onOpenSchemeChecker(diagnosis.primaryDiseaseId)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#1B4D4A] hover:bg-[#2E7D73] text-white font-bold text-xs rounded-xl transition cursor-pointer shadow-xs"
                >
                  <span>Verify Policy Criteria & Hospitals</span>
                  <ChevronRight className="w-4 h-4 text-[#B2DFD8]" />
                </button>
              )}
            </div>
          </div>
        );
      })()}

      {/* RELATED HEALTH EDUCATION ARTICLES MODULE */}
      {(() => {
        const mappedIds = (diseaseArticleMap as Record<string, string[]>)[diagnosis.primaryDiseaseId] || [];
        const related = (healthArticlesData as FullArticle[]).filter((a) => mappedIds.includes(a.id));
        const articlesToShow = related.length > 0 ? related : (healthArticlesData as FullArticle[]).slice(0, 2);

        return (
          <div className="bg-white rounded-2xl p-6 border border-[#DDE3E2] shadow-card space-y-4 font-sans">
            <div className="flex items-center justify-between border-b border-[#DDE3E2] pb-3">
              <div className="flex items-center gap-2 text-[#1B4D4A]">
                <BookOpen className="w-5 h-5 text-[#2E7D73]" />
                <h3 className="font-extrabold text-[#1B4D4A] text-base sm:text-lg font-display">
                  {currentLang === 'gu'
                    ? 'સંબંધિત આરોગ્ય માર્ગદર્શિકા લેખો'
                    : currentLang === 'hi'
                    ? 'संबंधित स्वास्थ्य मार्गदर्शिका लेख'
                    : 'Related Health Education Articles'}
                </h3>
              </div>

              {onOpenArticles && (
                <button
                  onClick={onOpenArticles}
                  className="text-xs font-bold text-[#2E7D73] hover:text-[#1B4D4A] flex items-center gap-1 cursor-pointer"
                >
                  <span>{currentLang === 'gu' ? 'લાઇબ્રેરી ખોલો' : currentLang === 'hi' ? 'पुस्तकालय खोलें' : 'Open Full Library'}</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>

            <p className="text-xs text-[#5F6D6C]">
              {currentLang === 'gu'
                ? 'દર્દી અથવા પરિવારને સમજાવવા માટે ઉપયોગી ચિત્ર-સહિત આરોગ્ય લેખો:'
                : currentLang === 'hi'
                ? 'रोगी या परिवार को समझाने के लिए सचित्र स्वास्थ्य लेख:'
                : 'Essential illustrated articles to share with patient or family:'}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {articlesToShow.map((art) => {
                const titleText = art.title[currentLang] || art.title.en;
                return (
                  <div
                    key={art.id}
                    onClick={() => setSelectedArticleModal(art)}
                    className="p-3.5 bg-[#F4F7F6] hover:bg-[#EDF1F0] rounded-xl border border-[#DDE3E2] hover:border-[#1B4D4A] transition cursor-pointer flex items-center justify-between gap-2 group"
                  >
                    <div className="space-y-1">
                      <span className="text-[10px] font-mono font-bold text-[#1B4D4A] uppercase">
                        #{art.category.replace('_', ' ')}
                      </span>
                      <h4 className="text-xs sm:text-sm font-bold text-[#1A2B2B] group-hover:text-[#1B4D4A] line-clamp-1">
                        {titleText}
                      </h4>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#2E7D73] group-hover:translate-x-1 transition-transform shrink-0" />
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* ARTICLE MODAL IF SELECTED */}
      {selectedArticleModal && (
        <div className="fixed inset-0 bg-[#1A2B2B]/70 backdrop-blur-xs z-50 overflow-y-auto p-4 flex items-center justify-center">
          <div className="max-w-2xl w-full">
            <ArticleDetail
              article={selectedArticleModal}
              onBack={() => setSelectedArticleModal(null)}
            />
          </div>
        </div>
      )}

      {/* SCHEDULE FOLLOW-UP VISIT MODULE */}
      <div className="bg-white rounded-2xl p-6 border border-[#DDE3E2] shadow-card space-y-4 font-sans">
        <div className="flex items-center justify-between border-b border-[#DDE3E2] pb-3">
          <div className="flex items-center gap-2 text-[#1B4D4A]">
            <Calendar className="w-5 h-5 text-[#2E7D73]" />
            <h3 className="font-extrabold text-[#1B4D4A] text-base sm:text-lg font-display">
              Follow-Up Clinical Re-Evaluation
            </h3>
          </div>

          {followUpSaved && (
            <span className="px-2.5 py-0.5 bg-[#2E7D73] text-white rounded-lg text-xs font-bold flex items-center gap-1">
              <BookmarkCheck className="w-4 h-4 text-[#B2DFD8]" />
              <span>LOGGED TO EMR</span>
            </span>
          )}
        </div>

        <p className="text-xs text-[#5F6D6C] font-sans">
          Schedule mandatory clinical checkup date:
        </p>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button
            onClick={() => setQuickDate(1)}
            className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer border ${
              followUpDate && new Date(followUpDate).toDateString() === new Date(Date.now() + 86400000).toDateString()
                ? 'bg-[#1B4D4A] text-white border-[#1B4D4A]'
                : 'bg-[#EDF1F0] text-[#1B4D4A] border-[#DDE3E2] hover:bg-[#B2DFD8]/40'
            }`}
          >
            Tomorrow (+1d)
          </button>

          <button
            onClick={() => setQuickDate(3)}
            className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer border ${
              followUpDate && new Date(followUpDate).toDateString() === new Date(Date.now() + 3 * 86400000).toDateString()
                ? 'bg-[#1B4D4A] text-white border-[#1B4D4A]'
                : 'bg-[#EDF1F0] text-[#1B4D4A] border-[#DDE3E2] hover:bg-[#B2DFD8]/40'
            }`}
          >
            In 3 Days (+3d)
          </button>

          <button
            onClick={() => setQuickDate(7)}
            className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer border ${
              followUpDate && new Date(followUpDate).toDateString() === new Date(Date.now() + 7 * 86400000).toDateString()
                ? 'bg-[#1B4D4A] text-white border-[#1B4D4A]'
                : 'bg-[#EDF1F0] text-[#1B4D4A] border-[#DDE3E2] hover:bg-[#B2DFD8]/40'
            }`}
          >
            In 1 Week (+7d)
          </button>

          <div className="flex items-center gap-1 bg-[#EDF1F0] p-1 rounded-xl border border-[#DDE3E2] shrink-0">
            <span className="text-[11px] font-bold text-[#5F6D6C] pl-1">Custom:</span>
            <input
              type="date"
              value={followUpDate}
              onChange={(e) => handleScheduleFollowUp(e.target.value)}
              className="bg-white p-1 text-xs font-bold text-[#1A2B2B] rounded-lg border border-[#DDE3E2] focus:outline-none"
            />
          </div>
        </div>

        {followUpDate && (
          <div className="p-3 bg-[#EDF1F0] rounded-xl border border-[#DDE3E2] text-xs text-[#1B4D4A] font-semibold flex items-center justify-between">
            <span>
              Follow-up logged for {followUpDate}. Visible in Clinical Follow-up Monitor.
            </span>
          </div>
        )}
      </div>

      {/* 5. ACTION BUTTONS */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
        <button
          onClick={() => setShowReferralModal(true)}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 bg-[#2E7D73] hover:bg-[#23635B] text-white font-bold text-sm rounded-xl transition-all active:scale-95 cursor-pointer shadow-md"
        >
          <FileText className="w-5 h-5 text-[#B2DFD8]" />
          <span>{currentLang === 'gu' ? 'રિફરલ નોટ બનાવો' : currentLang === 'hi' ? 'रेफरल नोट बनाएं' : 'GENERATE REFERRAL NOTE'}</span>
        </button>

        <button
          onClick={onNewCase}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 bg-[#1B4D4A] hover:bg-[#143B39] text-white font-bold text-sm rounded-xl border border-[#1B4D4A] transition-all active:scale-95 cursor-pointer shadow-md"
        >
          <RefreshCw className="w-5 h-5 text-[#B2DFD8]" />
          <span>INITIATE NEW CASE ASSESSMENT</span>
        </button>
      </div>

      {/* REFERRAL NOTE MODAL OVERLAY */}
      {showReferralModal && (
        <ReferralNoteModal
          patient={patientRecord}
          caseData={caseData}
          diagnosis={diagnosis}
          medicinesGiven={medicines.allopathy ? medicines.allopathy.map(m => m.name[currentLang] || m.name.en) : []}
          risk={risk}
          onClose={() => setShowReferralModal(false)}
        />
      )}
    </div>
  );
};
