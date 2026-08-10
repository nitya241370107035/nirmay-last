import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  CheckCircle2, 
  XCircle, 
  FileDown, 
  Sparkles, 
  HeartPulse, 
  Pill, 
  Droplet, 
  Footprints, 
  Calendar, 
  AlertTriangle,
  User,
  Plus,
  RefreshCw
} from 'lucide-react';
import { Patient, ChronicLog, LanguageCode } from '../../types';
import { db, saveChronicLog, getChronicLogsForPatient, getTodayChronicLog } from '../../db/db';
import { analyzeChronicPatientTrends, ChronicTrendAnalysis } from '../../engine/chronicEngine';
import { generateChronicWeeklyPdf } from '../../services/chronicPdfService';

interface ChronicCareDashboardProps {
  activePatient?: Patient | null;
  onBack?: () => void;
}

export const ChronicCareDashboard: React.FC<ChronicCareDashboardProps> = ({
  activePatient,
  onBack
}) => {
  const { i18n } = useTranslation();
  const currentLang = (i18n.language || 'en') as LanguageCode;

  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(activePatient?.id || null);
  const [analysis, setAnalysis] = useState<ChronicTrendAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);

  // Daily Log Form State
  const todayStr = new Date().toISOString().split('T')[0];
  const [logDate, setLogDate] = useState<string>(todayStr);
  const [morningGlucose, setMorningGlucose] = useState<string>('115');
  const [eveningGlucose, setEveningGlucose] = useState<string>('142');
  const [medicationAdherence, setMedicationAdherence] = useState<boolean>(true);
  const [exerciseMinutes, setExerciseMinutes] = useState<number>(25);
  const [waterIntake, setWaterIntake] = useState<number>(8);
  const [dietAdherence, setDietAdherence] = useState<number>(0.85);
  const [symptomsText, setSymptomsText] = useState<string>('');
  const [notesText, setNotesText] = useState<string>('');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    loadPatients();
  }, []);

  useEffect(() => {
    if (selectedPatientId) {
      loadData(selectedPatientId);
    }
  }, [selectedPatientId, currentLang]);

  const loadPatients = async () => {
    try {
      const allPatients = await db.patients.toArray();
      setPatients(allPatients);
      if (!selectedPatientId && allPatients.length > 0) {
        setSelectedPatientId(allPatients[0].id || 1);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadData = async (patientId: number) => {
    setIsLoading(true);
    try {
      // 1. Load today's log if present to prefill
      const todayLog = await getTodayChronicLog(patientId);
      if (todayLog) {
        if (todayLog.morningGlucose) setMorningGlucose(todayLog.morningGlucose.toString());
        if (todayLog.eveningGlucose) setEveningGlucose(todayLog.eveningGlucose.toString());
        setMedicationAdherence(todayLog.medicationAdherence);
        setExerciseMinutes(todayLog.exerciseMinutes || 0);
        setWaterIntake(todayLog.waterIntake || 8);
        setDietAdherence(todayLog.dietAdherence || 0.8);
        setSymptomsText(todayLog.symptoms || '');
        setNotesText(todayLog.notes || '');
      }

      // 2. Compute trends
      const trendResult = await analyzeChronicPatientTrends(patientId, currentLang);
      setAnalysis(trendResult);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId) return;

    setIsSaving(true);
    try {
      const logPayload: ChronicLog = {
        patientId: selectedPatientId,
        date: logDate,
        morningGlucose: morningGlucose ? parseFloat(morningGlucose) : undefined,
        eveningGlucose: eveningGlucose ? parseFloat(eveningGlucose) : undefined,
        medicationAdherence,
        exerciseMinutes,
        dietAdherence,
        waterIntake,
        symptoms: symptomsText,
        notes: notesText
      };

      await saveChronicLog(logPayload);
      setSaveSuccessMsg(
        currentLang === 'gu'
          ? 'દૈનિક વિગતો સફળતાપૂર્વક સાચવાઈ!'
          : currentLang === 'hi'
          ? 'दैनिक विवरण सफलतापूर्वक सहेजा गया!'
          : 'Daily metrics recorded successfully!'
      );
      setTimeout(() => setSaveSuccessMsg(null), 3500);

      // Refresh trend analytics
      await loadData(selectedPatientId);
    } catch (err) {
      console.error('Failed to save log', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSeedDemoLogs = async () => {
    if (!selectedPatientId) return;
    setIsLoading(true);
    try {
      const dates: string[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400000).toISOString().split('T')[0];
        dates.push(d);
      }

      const sampleGlucose = [112, 118, 125, 134, 142, 155, 168];
      const sampleEvening = [138, 145, 152, 160, 168, 180, 192];

      for (let i = 0; i < dates.length; i++) {
        await saveChronicLog({
          patientId: selectedPatientId,
          date: dates[i],
          morningGlucose: sampleGlucose[i],
          eveningGlucose: sampleEvening[i],
          medicationAdherence: i !== 4, // 1 missed dose
          exerciseMinutes: 20 + (i % 3) * 10,
          waterIntake: 7 + (i % 2),
          dietAdherence: 0.8,
          notes: `Day ${i + 1} test record`
        });
      }

      await loadData(selectedPatientId);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!selectedPatientId || !analysis) return;
    const currentPatient = patients.find((p) => p.id === selectedPatientId) || {
      name: 'Registered Patient',
      age: 45,
      gender: 'Female',
      village: 'Village Health Center'
    };

    setIsPdfGenerating(true);
    try {
      const pdfBlob = await generateChronicWeeklyPdf({
        patient: currentPatient,
        analysis,
        language: currentLang
      });

      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Niramay_Weekly_Chronic_Summary_${currentPatient.name?.replace(/\s+/g, '_')}_${todayStr}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to generate PDF', err);
    } finally {
      setIsPdfGenerating(false);
    }
  };

  const currentPatientObj = patients.find((p) => p.id === selectedPatientId);

  const texts = {
    title: currentLang === 'gu' ? 'ડાયાબિટીસ અને ક્રોનિક કેર ડેશબોર્ડ' : currentLang === 'hi' ? 'मधुमेह एवं क्रोनिक केयर डैशबोर्ड' : 'Chronic Disease & Glycemic Dashboard',
    subtitle: currentLang === 'gu' ? 'દૈનિક બ્લડ ગ્લુકોઝ, દવા પાલન (DOT) અને ટ્રેન્ડ વિશ્લેષણ.' : currentLang === 'hi' ? 'दैनिक रक्त शर्करा, दवा अनुपालन और ट्रेंड विश्लेषण।' : 'Daily fasting blood glucose, medication adherence (DOT), and automated clinical slope analysis.',
    todayLogTitle: currentLang === 'gu' ? 'આજની દૈનિક એન્ટ્રી (Daily Log)' : currentLang === 'hi' ? 'आज की दैनिक एंट्री' : 'Today\'s Clinical Metric Log',
    morningGlucoseLabel: currentLang === 'gu' ? 'સવારનું ગ્લુકોઝ (Fasting mg/dL)' : currentLang === 'hi' ? 'सुबह खाली पेट ग्लूकोज (mg/dL)' : 'Fasting Glucose (mg/dL)',
    eveningGlucoseLabel: currentLang === 'gu' ? 'સાંજનું ગ્લુકોઝ (Post-Meal mg/dL)' : currentLang === 'hi' ? 'शाम/भोजन बाद ग्लूकोज (mg/dL)' : 'Post-Meal Glucose (mg/dL)',
    medsTakenLabel: currentLang === 'gu' ? 'આજની દવાઓ લીધી છે?' : currentLang === 'hi' ? 'क्या आज की दवाएं ली हैं?' : 'Prescribed Doses Taken Today?',
    exerciseLabel: currentLang === 'gu' ? 'વ્યાયામ / ચાલવું (મિનિટ)' : currentLang === 'hi' ? 'व्यायाम / पैदल चलना (मिनट)' : 'Physical Activity (Minutes)',
    waterLabel: currentLang === 'gu' ? 'પાણીનું પ્રમાણ (ગ્લાસ)' : currentLang === 'hi' ? 'पानी का सेवन (ग्लास)' : 'Hydration (Glasses of Water)',
    saveLogBtn: currentLang === 'gu' ? 'વિગતો સાચવો' : currentLang === 'hi' ? 'विवरण सहेजें' : 'Save Daily Metric Log',
    downloadPdfBtn: currentLang === 'gu' ? 'સાપ્તાહિક સારાંશ PDF ડાઉનલોડ કરો' : currentLang === 'hi' ? 'साप्ताहिक सारांश PDF डाउनलोड करें' : 'Download Weekly Clinician PDF',
    seedDemoBtn: currentLang === 'gu' ? '૭ દિવસના ડેમો લૉગ્સ ઉમેરો' : currentLang === 'hi' ? '7 दिन के डेमो लॉग जोड़ें' : 'Simulate 7-Day Demo Records',
    patientSelect: currentLang === 'gu' ? 'દર્દી પસંદ કરો:' : currentLang === 'hi' ? 'रोगी चुनें:' : 'Select Patient:'
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6 font-sans">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-[#0F3835] via-[#1B4D4A] to-[#1E6B63] text-white p-6 sm:p-8 rounded-3xl shadow-lg border border-[#2E7D73]/50 flex flex-col sm:flex-row items-center sm:items-start justify-between gap-4 relative overflow-hidden">
        <div className="space-y-2 text-center sm:text-left z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/10 text-emerald-200 border border-white/20 text-xs font-bold backdrop-blur-xs">
            <Activity className="w-3.5 h-3.5 text-emerald-300 animate-pulse" />
            <span>AI & Statistical Trend Engine</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black font-display tracking-tight text-white">
            {texts.title}
          </h1>
          <p className="text-xs sm:text-sm text-[#B2DFD8] max-w-xl font-medium">
            {texts.subtitle}
          </p>

          {/* Patient Selector */}
          <div className="pt-2 flex items-center gap-2 flex-wrap">
            <span className="text-xs text-emerald-200 font-bold">{texts.patientSelect}</span>
            <select
              value={selectedPatientId || ''}
              onChange={(e) => setSelectedPatientId(Number(e.target.value))}
              className="bg-[#092422] text-white text-xs font-bold px-3 py-1.5 rounded-xl border border-[#38A394]/50 focus:outline-none focus:ring-2 focus:ring-emerald-400"
            >
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.age}y, {p.village || 'Local'})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2 z-10">
          <button
            onClick={handleDownloadPdf}
            disabled={isPdfGenerating || !analysis}
            className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-[#0F3835] font-extrabold text-xs sm:text-sm rounded-2xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <FileDown className="w-4 h-4" />
            <span>{isPdfGenerating ? 'Generating...' : texts.downloadPdfBtn}</span>
          </button>

          <button
            onClick={handleSeedDemoLogs}
            disabled={isLoading}
            className="px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-2xl border border-white/20 transition flex items-center justify-center gap-1.5 cursor-pointer"
            title="Populate 7 days of realistic logs to preview trend calculations"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>{texts.seedDemoBtn}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      {analysis && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Fasting Glucose 7-Day Average */}
          <div className="glass-card p-5 border border-[#D5E2DF] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#4A6360] uppercase">7-Day Fasting Avg</span>
              <Droplet className="w-4 h-4 text-teal-600" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black font-display text-[#0F3835]">
                {analysis.morningGlucoseAvg7d || '--'}
              </span>
              <span className="text-xs font-bold text-[#4A6360]">mg/dL</span>
            </div>
            <p className="text-[11px] text-[#4A6360] font-medium">
              Target: <strong>70 - 130 mg/dL</strong>
            </p>
          </div>

          {/* Card 2: Trend Slope & Direction */}
          <div className="glass-card p-5 border border-[#D5E2DF] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#4A6360] uppercase">Glucose Trend (OLS)</span>
              {analysis.trendDirection === 'rising' ? (
                <TrendingUp className="w-4 h-4 text-red-600" />
              ) : analysis.trendDirection === 'falling' ? (
                <TrendingDown className="w-4 h-4 text-emerald-600" />
              ) : (
                <Minus className="w-4 h-4 text-teal-600" />
              )}
            </div>
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl font-black font-display uppercase ${
                analysis.trendDirection === 'rising' ? 'text-red-700' : analysis.trendDirection === 'falling' ? 'text-emerald-700' : 'text-teal-800'
              }`}>
                {analysis.trendDirection}
              </span>
              <span className="text-xs font-mono text-[#4A6360]">
                ({analysis.glucoseSlope > 0 ? '+' : ''}{analysis.glucoseSlope} /day)
              </span>
            </div>
            <p className="text-[11px] text-[#4A6360] font-medium">
              Calculated via least squares regression
            </p>
          </div>

          {/* Card 3: Medication Adherence Rate */}
          <div className="glass-card p-5 border border-[#D5E2DF] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#4A6360] uppercase">Med Adherence Rate</span>
              <Pill className="w-4 h-4 text-amber-600" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className={`text-3xl font-black font-display ${
                analysis.adherenceRatePercent >= 80 ? 'text-emerald-700' : 'text-amber-700'
              }`}>
                {analysis.adherenceRatePercent}%
              </span>
            </div>
            <p className="text-[11px] text-[#4A6360] font-medium">
              Based on {analysis.totalLogs} recorded log days
            </p>
          </div>

          {/* Card 4: Clinical Risk Level */}
          <div className="glass-card p-5 border border-[#D5E2DF] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#4A6360] uppercase">Glycemic Risk Tier</span>
              <HeartPulse className="w-4 h-4 text-rose-600" />
            </div>
            <div>
              <span className={`inline-block px-3 py-1 rounded-xl text-xs font-extrabold uppercase shadow-2xs ${
                analysis.riskLevel === 'high'
                  ? 'bg-red-100 text-red-800 border border-red-300'
                  : analysis.riskLevel === 'medium'
                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                  : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
              }`}>
                {analysis.riskLevel} Risk Level
              </span>
            </div>
            <p className="text-[11px] text-[#4A6360] font-medium">
              Combined metabolic assessment
            </p>
          </div>
        </div>
      )}

      {/* Main Grid: Form on Left, Personalized Nudges & Graph on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT: Daily Entry Form */}
        <div className="lg:col-span-6 glass-card p-6 border border-[#D5E2DF] space-y-4">
          <div className="flex items-center justify-between border-b border-[#D5E2DF] pb-3">
            <h2 className="text-base font-extrabold text-[#0F3835] font-display flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#1E6B63]" />
              <span>{texts.todayLogTitle}</span>
            </h2>
            <input
              type="date"
              value={logDate}
              onChange={(e) => setLogDate(e.target.value)}
              className="text-xs font-bold bg-[#EBF2F0] px-3 py-1.5 rounded-xl border border-[#D5E2DF] text-[#0F3835]"
            />
          </div>

          <form onSubmit={handleSaveLog} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-[#0F3835] block mb-1">
                  {texts.morningGlucoseLabel}
                </label>
                <input
                  type="number"
                  step="1"
                  value={morningGlucose}
                  onChange={(e) => setMorningGlucose(e.target.value)}
                  placeholder="e.g. 110"
                  className="w-full p-2.5 rounded-xl border border-[#D5E2DF] bg-white font-bold text-[#0F3835] focus:outline-none focus:border-[#1E6B63]"
                />
              </div>

              <div>
                <label className="font-bold text-[#0F3835] block mb-1">
                  {texts.eveningGlucoseLabel}
                </label>
                <input
                  type="number"
                  step="1"
                  value={eveningGlucose}
                  onChange={(e) => setEveningGlucose(e.target.value)}
                  placeholder="e.g. 140"
                  className="w-full p-2.5 rounded-xl border border-[#D5E2DF] bg-white font-bold text-[#0F3835] focus:outline-none focus:border-[#1E6B63]"
                />
              </div>
            </div>

            {/* Medication Adherence Pill Toggle */}
            <div className="p-3 bg-[#EBF2F0]/80 rounded-2xl border border-[#D5E2DF] flex items-center justify-between">
              <div>
                <span className="font-bold text-[#0F3835] block">{texts.medsTakenLabel}</span>
                <span className="text-[11px] text-[#4A6360]">Directly observed therapy adherence</span>
              </div>
              <button
                type="button"
                onClick={() => setMedicationAdherence(!medicationAdherence)}
                className={`px-4 py-1.5 rounded-xl font-extrabold text-xs transition cursor-pointer flex items-center gap-1.5 ${
                  medicationAdherence
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-red-600 text-white shadow-xs'
                }`}
              >
                {medicationAdherence ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>YES, TAKEN</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4" />
                    <span>MISSED</span>
                  </>
                )}
              </button>
            </div>

            {/* Lifestyle Inputs: Exercise and Water */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-[#0F3835] flex items-center gap-1 mb-1">
                  <Footprints className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{texts.exerciseLabel}</span>
                </label>
                <input
                  type="number"
                  value={exerciseMinutes}
                  onChange={(e) => setExerciseMinutes(parseInt(e.target.value) || 0)}
                  min="0"
                  max="180"
                  className="w-full p-2.5 rounded-xl border border-[#D5E2DF] bg-white font-bold text-[#0F3835]"
                />
              </div>

              <div>
                <label className="font-bold text-[#0F3835] flex items-center gap-1 mb-1">
                  <Droplet className="w-3.5 h-3.5 text-teal-600" />
                  <span>{texts.waterLabel}</span>
                </label>
                <input
                  type="number"
                  value={waterIntake}
                  onChange={(e) => setWaterIntake(parseInt(e.target.value) || 0)}
                  min="0"
                  max="20"
                  className="w-full p-2.5 rounded-xl border border-[#D5E2DF] bg-white font-bold text-[#0F3835]"
                />
              </div>
            </div>

            {/* Symptoms & Notes */}
            <div>
              <label className="font-bold text-[#0F3835] block mb-1">
                Any symptoms or special clinical observations:
              </label>
              <input
                type="text"
                value={symptomsText}
                onChange={(e) => setSymptomsText(e.target.value)}
                placeholder="e.g. Mild dizziness, numbness in toes, excess thirst..."
                className="w-full p-2.5 rounded-xl border border-[#D5E2DF] bg-white text-[#0F3835]"
              />
            </div>

            {saveSuccessMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 font-bold text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{saveSuccessMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSaving}
              className="w-full py-3 bg-[#1E6B63] hover:bg-[#0F3835] text-white font-extrabold rounded-xl shadow-md transition cursor-pointer"
            >
              {isSaving ? 'Saving...' : texts.saveLogBtn}
            </button>
          </form>
        </div>

        {/* RIGHT: Nudges, Trend Visualizer & Logs */}
        <div className="lg:col-span-6 space-y-4">
          {/* Actionable Clinical Nudges */}
          {analysis && analysis.matchedNudges.length > 0 && (
            <div className="glass-card p-5 border border-[#D5E2DF] space-y-3 bg-gradient-to-br from-white via-[#F3F7F6] to-[#E6F6F4]">
              <div className="flex items-center gap-2 text-[#0F3835] font-extrabold text-xs uppercase tracking-wider">
                <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
                <span>Personalized Clinical Guidance & Nudges</span>
              </div>

              <div className="space-y-2">
                {analysis.matchedNudges.map((nudge, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 bg-white rounded-2xl border border-[#B2DFD8] shadow-xs text-xs text-[#0F3835] leading-relaxed font-medium"
                  >
                    • {nudge.text}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent History Table Preview */}
          <div className="glass-card p-5 border border-[#D5E2DF] space-y-3">
            <h3 className="text-xs font-extrabold text-[#0F3835] uppercase tracking-wider">
              Recent Recorded Logs ({analysis?.recentLogs.length || 0})
            </h3>

            {analysis?.recentLogs.length === 0 ? (
              <p className="text-xs text-[#4A6360] py-4 text-center">
                No logs recorded yet. Use the form on the left or simulate 7-day demo records.
              </p>
            ) : (
              <div className="max-h-64 overflow-y-auto space-y-2 text-xs">
                {analysis?.recentLogs.slice().reverse().map((log, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-[#EBF2F0]/70 rounded-xl border border-[#D5E2DF] flex items-center justify-between"
                  >
                    <div>
                      <span className="font-bold text-[#0F3835] block">{log.date}</span>
                      <span className="text-[11px] text-[#4A6360]">
                        Fast: <strong>{log.morningGlucose || '--'}</strong> mg/dL | Post: <strong>{log.eveningGlucose || '--'}</strong> mg/dL
                      </span>
                    </div>
                    <div className="text-right">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        log.medicationAdherence ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {log.medicationAdherence ? 'MEDS ✓' : 'MISSED ✕'}
                      </span>
                      <span className="block text-[10px] text-[#4A6360] mt-0.5 font-mono">
                        {log.exerciseMinutes || 0}m walk
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
