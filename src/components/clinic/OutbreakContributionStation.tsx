import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Radio,
  FileText,
  MapPin,
  Send,
  CheckCircle2,
  Activity,
  Users,
  TrendingUp,
  RefreshCw,
  Sparkles,
  Info,
  Calendar,
  Building2,
  X,
  Check,
  ChevronRight,
  ShieldCheck,
  ShieldAlert,
  Flame,
  Clock,
  Printer,
  FileSpreadsheet,
  AlertTriangle,
  User,
  Stethoscope,
  BarChart3
} from 'lucide-react';
import { RiskLevel, LanguageCode, OutbreakAlert } from '../../types';
import { ClinicProfile } from './ClinicLogin';
import {
  analyzeWeeklyClinicOutbreaks,
  publishOutbreakAlert,
  resolveOutbreakAlert,
  DetectedDiseaseCluster,
  OutbreakPublishPayload,
  WeeklyClinicEpidemiologyReport,
  DiseaseLocationBreakdown,
  REGIONAL_COORDINATES
} from '../../services/outbreakAnalyticsService';

interface OutbreakContributionStationProps {
  clinicProfile: ClinicProfile | null;
  onViewCitizenOutbreakScreen?: () => void;
}

export const OutbreakContributionStation: React.FC<OutbreakContributionStationProps> = ({
  clinicProfile,
  onViewCitizenOutbreakScreen
}) => {
  const { i18n } = useTranslation();
  const currentLang = (i18n.language || 'en') as LanguageCode;

  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [weeklyReport, setWeeklyReport] = useState<WeeklyClinicEpidemiologyReport | null>(null);
  const [clusters, setClusters] = useState<DetectedDiseaseCluster[]>([]);
  const [activePublishedAlerts, setActivePublishedAlerts] = useState<OutbreakAlert[]>([]);
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);
  const [selectedDiseaseForRelease, setSelectedDiseaseForRelease] = useState<DiseaseLocationBreakdown | null>(null);
  const [isReleaseModalOpen, setIsReleaseModalOpen] = useState<boolean>(false);
  const [isPublishing, setIsPublishing] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Manual Release Form State
  const [formDiseaseId, setFormDiseaseId] = useState<string>('dengue');
  const [formDiseaseNameEn, setFormDiseaseNameEn] = useState<string>('Dengue Mosquito Fever');
  const [formLocation, setFormLocation] = useState<string>('Sanand & Anandpura');
  const [formRadiusKm, setFormRadiusKm] = useState<number>(5);
  const [formCaseCount, setFormCaseCount] = useState<number>(5);
  const [formSeverity, setFormSeverity] = useState<RiskLevel>('red');
  const [formGrowthPct, setFormGrowthPct] = useState<number>(150);
  const [formStaffName, setFormStaffName] = useState<string>(
    clinicProfile?.doctorName || 'Dr. Devang Mehta, MD (Clinic Incharge)'
  );
  const [formCustomGuidanceEn, setFormCustomGuidanceEn] = useState<string>(
    'Urgent dengue mosquito breeding containment advisory. Clean stagnant water, sleep under bed nets and report fever immediately.'
  );

  useEffect(() => {
    loadSurveillanceData();
  }, [clinicProfile?.facilityCode]);

  const loadSurveillanceData = async () => {
    setLoading(true);
    try {
      const data = await analyzeWeeklyClinicOutbreaks(
        clinicProfile?.facilityCode || 'CHC-SAN-01',
        clinicProfile?.clinicName || 'Sanand Community Health Center & General Hospital'
      );
      setWeeklyReport(data.weeklyReport);
      setClusters(data.clusters);
      setActivePublishedAlerts(data.activePublishedAlerts);
    } catch (e) {
      console.error('Failed to load clinic surveillance data', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleManualRefresh = () => {
    setRefreshing(true);
    loadSurveillanceData();
  };

  // Open the Manual Release Modal prefilled with specific disease data from the weekly report
  const handleOpenReleaseForDisease = (disease: DiseaseLocationBreakdown) => {
    setSelectedDiseaseForRelease(disease);
    setFormDiseaseId(disease.diseaseId);
    setFormDiseaseNameEn(disease.diseaseName.en);
    setFormLocation(disease.locationDistribution[0]?.location || 'Sanand & Anandpura');
    setFormCaseCount(disease.totalCases);
    setFormSeverity(disease.totalCases >= 5 ? 'red' : disease.totalCases >= 3 ? 'orange' : 'green');
    setFormRadiusKm(REGIONAL_COORDINATES[disease.locationDistribution[0]?.location || '']?.defaultRadiusKm || 5);
    setFormStaffName(clinicProfile?.doctorName || 'Dr. Devang Mehta, MD');
    setFormCustomGuidanceEn(
      `High surge of ${disease.diseaseName.en} observed in this locality. Please seek early medical screening and follow local hygiene precautions.`
    );
    setIsReleaseModalOpen(true);
  };

  // Open Generic Manual Release Modal
  const handleOpenGenericReleaseModal = () => {
    setSelectedDiseaseForRelease(null);
    setFormDiseaseId('dengue');
    setFormDiseaseNameEn('Dengue Mosquito Fever');
    setFormLocation('Sanand & Anandpura');
    setFormRadiusKm(5);
    setFormCaseCount(5);
    setFormSeverity('red');
    setFormStaffName(clinicProfile?.doctorName || 'Dr. Devang Mehta, MD');
    setIsReleaseModalOpen(true);
  };

  // Execute Manual Release Action
  const handleExecuteManualRelease = async () => {
    setIsPublishing(true);
    try {
      const coords = REGIONAL_COORDINATES[formLocation] || { lat: 22.99, lng: 72.37, defaultRadiusKm: 5 };

      const payload: OutbreakPublishPayload = {
        diseaseId: formDiseaseId,
        diseaseName: {
          en: formDiseaseNameEn,
          hi: `${formDiseaseNameEn} प्रकोप`,
          gu: `${formDiseaseNameEn} ઉપદ્રવ`
        },
        locationName: formLocation,
        lat: coords.lat,
        lng: coords.lng,
        radiusKm: formRadiusKm,
        caseCount: formCaseCount,
        severity: formSeverity,
        weeklyGrowthPct: formGrowthPct,
        affectedAreas: selectedDiseaseForRelease?.locationDistribution.map((l) => l.location) || [formLocation],
        customGuidance: {
          en: formCustomGuidanceEn,
          hi: formCustomGuidanceEn,
          gu: formCustomGuidanceEn
        },
        contributingFacility: {
          clinicName: clinicProfile?.clinicName || 'Sanand Community Health Center & General Hospital',
          facilityCode: clinicProfile?.facilityCode || 'CHC-SAN-01',
          doctorName: formStaffName
        }
      };

      await publishOutbreakAlert(payload);
      setToastMessage(
        currentLang === 'gu'
          ? `${clinicProfile?.clinicName || 'ક્લિનિક'} દ્વારા રોગચાળો એલર્ટ નાગરિકો માટે બહાર પાડવામાં આવ્યો.`
          : currentLang === 'hi'
          ? `${clinicProfile?.clinicName || 'क्लिनिक'} द्वारा प्रकोप अलर्ट नागरिकों के लिए जारी किया गया।`
          : `Outbreak Alert successfully released by ${clinicProfile?.clinicName || 'Clinic'} to Citizen App.`
      );
      setIsReleaseModalOpen(false);
      await loadSurveillanceData();
    } catch (e) {
      console.error('Failed to manually release outbreak alert', e);
    } finally {
      setIsPublishing(false);
      setTimeout(() => setToastMessage(null), 5000);
    }
  };

  const handleResolveAlert = async (alertId: string) => {
    try {
      await resolveOutbreakAlert(alertId);
      setToastMessage(
        currentLang === 'gu'
          ? 'રોગચાળો ચેતવણી સફળતાપૂર્વક બંધ કરવામાં આવી.'
          : currentLang === 'hi'
          ? 'प्रकोप अलर्ट सफलतापूर्वक समाप्त किया गया।'
          : 'Outbreak Alert closed by clinic.'
      );
      await loadSurveillanceData();
    } catch (e) {
      console.error('Failed to resolve alert', e);
    } finally {
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-950 text-emerald-100 border-2 border-emerald-500 rounded-2xl px-5 py-3.5 shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-4 duration-300">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs sm:text-sm font-bold">{toastMessage}</span>
        </div>
      )}

      {/* Main Clinic-Specific Outbreak Hub Card */}
      <div className="bg-gradient-to-r from-[#072421] via-[#0C3833] to-[#124B45] text-white rounded-3xl p-5 sm:p-7 shadow-xl border border-teal-500/20 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-500/20 text-red-300 border border-red-400/30 rounded-full text-[11px] font-mono font-black uppercase tracking-wider">
                <Radio className="w-3.5 h-3.5 animate-pulse text-red-400" />
                {currentLang === 'gu' ? 'ક્લિનિક રોગચાળો રીલીઝ ડેસ્ક' : currentLang === 'hi' ? 'क्लिनिक प्रकोप रिलीज डेस्क' : 'Clinic Outbreak Release Desk'}
              </span>
              <span className="text-xs font-bold text-teal-200 bg-white/10 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5" />
                {clinicProfile?.clinicName || 'Sanand CHC Hospital'} ({clinicProfile?.facilityCode || 'CHC-SAN-01'})
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              {currentLang === 'gu'
                ? 'સાપ્તાહિક કેસોનો રિપોર્ટ અને જાતે રોગચાળો એલર્ટ બહાર પાડો'
                : currentLang === 'hi'
                ? 'साप्ताहिक केस रिपोर्ट देखें और स्वयं प्रकोप अलर्ट जारी करें'
                : 'Weekly Disease & Area Report & Manual Outbreak Release'}
            </h2>

            <p className="text-xs sm:text-sm text-teal-100/80 max-w-2xl leading-relaxed">
              {currentLang === 'gu'
                ? 'આ ક્લિનિકમાં છેલ્લા ૭ દિવસમાં આવેલા દર્દીઓના રોગ અને રહેઠાણ વિસ્તારનો સંપૂર્ણ રિપોર્ટ મેળવો. ક્લિનિક સ્ટાફ રિપોર્ટ વાંચીને જાતે નાગરિકો માટે એલર્ટ બહાર પાડી શકે છે.'
                : currentLang === 'hi'
                ? 'इस क्लिनिक में पिछले 7 दिनों में आए मरीजों की बीमारी व क्षेत्र की पूरी रिपोर्ट देखें। क्लिनिक स्टाफ रिपोर्ट पढ़कर स्वयं नागरिकों के लिए अलर्ट जारी कर सकता है।'
                : 'Generate your clinic’s 7-day disease & patient origin report. Review the data and manually release an outbreak alert to citizens when a localized surge is detected.'}
            </p>
          </div>

          {/* Primary Action Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
            {/* PRIMARY BUTTON: Get whole weekly report */}
            <button
              onClick={() => setIsReportModalOpen(true)}
              className="flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 active:scale-95 text-[#072421] font-black text-xs sm:text-sm rounded-2xl shadow-xl transition cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-[#072421]" />
              <span>
                {currentLang === 'gu'
                  ? 'સાપ્તાહિક રોગ અને વિસ્તારનો સંપૂર્ણ રિપોર્ટ જુઓ'
                  : currentLang === 'hi'
                  ? 'साप्ताहिक बीमारी एवं क्षेत्र की पूरी रिपोर्ट देखें'
                  : 'Get Whole Weekly Disease & Area Report'}
              </span>
            </button>

            {/* SECONDARY BUTTON: Manually release an outbreak */}
            <button
              onClick={handleOpenGenericReleaseModal}
              className="flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 active:scale-95 text-white font-black text-xs sm:text-sm rounded-2xl shadow-lg transition cursor-pointer"
            >
              <ShieldAlert className="w-4 h-4 text-white" />
              <span>
                {currentLang === 'gu'
                  ? 'જાતે એલર્ટ બહાર પાડો'
                  : currentLang === 'hi'
                  ? 'स्वयं अलर्ट जारी करें'
                  : 'Manually Release Outbreak Alert'}
              </span>
            </button>
          </div>
        </div>

        {/* Quick KPI Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-white/15">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/10">
            <span className="text-teal-200 text-xs font-bold block">7-Day Clinic OPD Encounters</span>
            <p className="text-2xl font-black text-white mt-0.5">{weeklyReport?.reportPeriod.totalEncounters || 0}</p>
            <span className="text-[10px] text-teal-300">Patients diagnosed at this clinic</span>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/10">
            <span className="text-amber-200 text-xs font-bold block">Distinct Diagnosed Diseases</span>
            <p className="text-2xl font-black text-amber-300 mt-0.5">{weeklyReport?.diseasesBreakdown.length || 0}</p>
            <span className="text-[10px] text-amber-200">Across all patient origins</span>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/10">
            <span className="text-cyan-200 text-xs font-bold block">Patient Geographic Origins</span>
            <p className="text-2xl font-black text-cyan-300 mt-0.5">{weeklyReport?.locationsSummary.length || 0}</p>
            <span className="text-[10px] text-cyan-200">Villages / Sectors served</span>
          </div>

          <div className="bg-emerald-500/20 backdrop-blur-md rounded-2xl p-3.5 border border-emerald-500/30">
            <span className="text-emerald-200 text-xs font-bold block">Alerts Released by this Clinic</span>
            <p className="text-2xl font-black text-emerald-200 mt-0.5">{activePublishedAlerts.length}</p>
            <span className="text-[10px] text-emerald-300">Active on citizen app</span>
          </div>
        </div>
      </div>

      {/* Section: Overview of Diagnosed Diseases & Locations this Week */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Diseases Breakdown with Direct "Release Outbreak" Buttons */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-teal-700" />
              <h3 className="text-base sm:text-lg font-black text-slate-900">
                {currentLang === 'gu'
                  ? 'સાપ્તાહિક નિદાન થયેલ રોગો અને દર્દીઓના વિસ્તારો'
                  : currentLang === 'hi'
                  ? 'साप्ताहिक निदानित बीमारियां एवं मरीजों के क्षेत्र'
                  : 'Weekly Diagnosed Conditions & Patient Locations'}
              </h3>
            </div>
            <button
              onClick={() => setIsReportModalOpen(true)}
              className="text-xs font-extrabold text-teal-700 hover:text-teal-900 bg-teal-50 hover:bg-teal-100 px-3 py-1.5 rounded-xl border border-teal-200 transition cursor-pointer flex items-center gap-1"
            >
              <span>{currentLang === 'gu' ? 'રિપોર્ટ મોડલ ખોલો' : currentLang === 'hi' ? 'पूरी रिपोर्ट खोलें' : 'Open Full Report'}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {loading ? (
            <div className="bg-white rounded-2xl p-10 text-center border border-slate-200 shadow-sm space-y-2">
              <Activity className="w-6 h-6 text-teal-600 animate-spin mx-auto" />
              <p className="text-xs font-bold text-slate-500">Loading clinic weekly encounter logs...</p>
            </div>
          ) : !weeklyReport || weeklyReport.diseasesBreakdown.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 shadow-sm space-y-2">
              <ShieldCheck className="w-8 h-8 text-emerald-600 mx-auto" />
              <p className="text-xs font-bold text-slate-600">No patient encounters logged in the past 7 days.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {weeklyReport.diseasesBreakdown.map((disease) => {
                const isHigh = disease.identifiedRiskTier === 'High Surge';
                const isMod = disease.identifiedRiskTier === 'Moderate';

                return (
                  <div
                    key={disease.diseaseId}
                    className={`bg-white rounded-2xl p-4 sm:p-5 border-2 transition shadow-sm space-y-3.5 ${
                      isHigh
                        ? 'border-red-500/40 bg-gradient-to-br from-red-50/20 via-white to-rose-50/20'
                        : isMod
                        ? 'border-amber-500/40 bg-gradient-to-br from-amber-50/20 via-white to-orange-50/20'
                        : 'border-slate-200'
                    }`}
                  >
                    {/* Disease Row Header */}
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-black uppercase flex items-center gap-1 ${
                              isHigh
                                ? 'bg-red-600 text-white'
                                : isMod
                                ? 'bg-amber-600 text-white'
                                : 'bg-emerald-600 text-white'
                            }`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                            {isHigh ? 'HIGH SURGE' : isMod ? 'MODERATE' : 'STABLE'}
                          </span>
                          <span className="text-xs font-bold text-slate-500">
                            {disease.percentageOfOPD}% of 7-day OPD
                          </span>
                        </div>

                        <h4 className="text-base font-black text-slate-900">
                          {disease.diseaseName?.[currentLang] || disease.diseaseName?.en}
                        </h4>
                      </div>

                      <div className="text-right">
                        <span className="text-xl font-black text-slate-900">{disease.totalCases}</span>
                        <span className="text-xs text-slate-500 font-bold block">patients this week</span>
                      </div>
                    </div>

                    {/* Patient Origins Breakdown */}
                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80 space-y-1.5">
                      <span className="text-xs font-extrabold text-slate-700 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-teal-700" />
                        Patient Origins (Where they came from):
                      </span>
                      <div className="flex flex-wrap gap-2 pt-0.5">
                        {disease.locationDistribution.map((loc, lIdx) => (
                          <span
                            key={lIdx}
                            className="bg-white px-2.5 py-1 rounded-lg border border-slate-200 text-slate-800 font-bold text-xs flex items-center gap-1.5 shadow-2xs"
                          >
                            <MapPin className="w-3 h-3 text-teal-600" />
                            <span>{loc.location}</span>
                            <span className="bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded-md font-mono text-[11px]">
                              {loc.caseCount} {loc.caseCount === 1 ? 'patient' : 'patients'}
                            </span>
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Manual Release Action for this specific disease */}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                      <span className="text-[11px] text-slate-500">
                        Observed from {clinicProfile?.clinicName || 'Sanand CHC Hospital'}
                      </span>

                      <button
                        onClick={() => handleOpenReleaseForDisease(disease)}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 active:scale-95 text-white font-extrabold text-xs rounded-xl shadow-xs transition cursor-pointer"
                      >
                        <ShieldAlert className="w-3.5 h-3.5" />
                        <span>
                          {currentLang === 'gu'
                            ? 'આ રોગ માટે એલર્ટ બહાર પાડો'
                            : currentLang === 'hi'
                            ? 'इस बीमारी के लिए अलर्ट जारी करें'
                            : 'Manually Release Outbreak'}
                        </span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right 1 Column: Clinic's Active Released Bulletins */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Radio className="w-5 h-5 text-emerald-600" />
              <h3 className="text-base sm:text-lg font-black text-slate-900">
                {currentLang === 'gu' ? 'આ ક્લિનિક દ્વારા જાહેર થયેલ એલર્ટ' : currentLang === 'hi' ? 'इस क्लिनिक द्वारा जारी अलर्ट' : 'Alerts Released by this Clinic'}
              </h3>
            </div>
            <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
              {activePublishedAlerts.length} Active
            </span>
          </div>

          {activePublishedAlerts.length === 0 ? (
            <div className="bg-white rounded-2xl p-6 text-center border border-slate-200 shadow-sm space-y-2">
              <Info className="w-7 h-7 text-slate-400 mx-auto" />
              <p className="text-xs font-bold text-slate-600">No active alerts released yet by this clinic.</p>
              <p className="text-[11px] text-slate-400">
                After reading the weekly report, you can manually release an outbreak bulletin to citizen phones.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {activePublishedAlerts.map((alert) => (
                <div key={alert.id} className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[9px] font-mono font-black uppercase px-2 py-0.5 rounded-full bg-red-100 text-red-800 flex items-center gap-1 w-max">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
                        {alert.riskLevel.toUpperCase()} OUTBREAK
                      </span>
                      <h4 className="text-sm font-extrabold text-slate-900 mt-1">
                        {alert.diseaseName?.[currentLang] || alert.diseaseName?.en}
                      </h4>
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        {alert.center?.villageName} (~{alert.radiusKm} km radius)
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-lg font-black text-slate-900">{alert.caseCount}</span>
                      <span className="text-[10px] text-slate-400 block">cases</span>
                    </div>
                  </div>

                  <div className="text-[11px] text-teal-900 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-100 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-teal-700" />
                    <span>Released by: <strong>{alert.contributingFacility?.doctorName || 'Clinic Doctor'}</strong> ({alert.contributingFacility?.clinicName})</span>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[11px]">
                    <span className="text-slate-400">
                      {new Date(alert.lastReported).toLocaleDateString()}
                    </span>
                    <button
                      onClick={() => handleResolveAlert(alert.id)}
                      className="text-rose-600 hover:text-rose-700 font-bold cursor-pointer"
                    >
                      Resolve / Close Outbreak
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Quick Notice Box */}
          <div className="bg-gradient-to-br from-teal-50 to-emerald-50 rounded-2xl p-4 border border-teal-200/60 text-xs space-y-2 text-teal-950">
            <div className="flex items-center gap-1.5 font-bold">
              <ShieldCheck className="w-4 h-4 text-teal-700" />
              <span>Independent Clinic Outbreak Protocol</span>
            </div>
            <p className="text-[11px] text-teal-800 leading-relaxed">
              Each clinic operates independently. Releasing an outbreak here only publishes verified cases from your own hospital's patients and areas.
            </p>
          </div>
        </div>
      </div>

      {/* FULL WEEKLY REPORT MODAL */}
      {isReportModalOpen && weeklyReport && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl space-y-6 border border-slate-200 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
            {/* Report Header */}
            <div className="flex items-start justify-between border-b border-slate-200 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-teal-100 flex items-center justify-center text-teal-800">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-black text-slate-900">
                      {currentLang === 'gu'
                        ? 'સાપ્તાહિક રોગચાળો અને દર્દી વિસ્તાર વિશ્લેષણ રિપોર્ટ'
                        : currentLang === 'hi'
                        ? 'साप्ताहिक बीमारी एवं मरीज क्षेत्र विश्लेषण रिपोर्ट'
                        : 'Weekly Clinical Disease & Patient Area Report'}
                    </h3>
                    <p className="text-xs text-slate-500 font-bold flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5" />
                      {weeklyReport.clinicName} (Code: {weeklyReport.facilityCode})
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setIsReportModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Report Metadata */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
              <div>
                <span className="text-slate-400 block font-medium">Report Period (7 Days)</span>
                <span className="font-bold text-slate-800">
                  {new Date(weeklyReport.reportPeriod.startDate).toLocaleDateString()} — {new Date(weeklyReport.reportPeriod.endDate).toLocaleDateString()}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Total OPD Patients Logged</span>
                <span className="font-bold text-slate-800">{weeklyReport.reportPeriod.totalEncounters} Encounters</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Reporting Facility</span>
                <span className="font-bold text-slate-800">{weeklyReport.clinicName}</span>
              </div>
            </div>

            {/* Section 1: Diseases Breakdown Table */}
            <div className="space-y-3">
              <h4 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-teal-700" />
                <span>1. Diagnosed Conditions & Patient Origin Locations</span>
              </h4>

              <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                <table className="w-full text-left text-xs font-sans">
                  <thead className="bg-slate-100 text-slate-700 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="p-3">Disease Name</th>
                      <th className="p-3 text-center">Cases</th>
                      <th className="p-3 text-center">% OPD</th>
                      <th className="p-3">Patient Origins (Villages / Areas)</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {weeklyReport.diseasesBreakdown.map((d) => (
                      <tr key={d.diseaseId} className="hover:bg-slate-50">
                        <td className="p-3 font-bold text-slate-900">
                          {d.diseaseName[currentLang] || d.diseaseName.en}
                          <span
                            className={`ml-2 text-[9px] px-2 py-0.5 rounded-md font-mono font-bold inline-flex items-center gap-1 ${
                              d.identifiedRiskTier === 'High Surge'
                                ? 'bg-red-100 text-red-800'
                                : d.identifiedRiskTier === 'Moderate'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-current" />
                            {d.identifiedRiskTier}
                          </span>
                        </td>
                        <td className="p-3 text-center font-black text-slate-900">{d.totalCases}</td>
                        <td className="p-3 text-center font-bold text-slate-500">{d.percentageOfOPD}%</td>
                        <td className="p-3">
                          <div className="flex flex-wrap gap-1">
                            {d.locationDistribution.map((l, idx) => (
                              <span key={idx} className="bg-slate-100 px-2 py-0.5 rounded-md text-[11px] font-semibold text-slate-700 inline-flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-slate-500" />
                                {l.location} ({l.caseCount})
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => {
                              setIsReportModalOpen(false);
                              handleOpenReleaseForDisease(d);
                            }}
                            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 active:scale-95 text-white font-extrabold text-[11px] rounded-xl shadow-xs transition cursor-pointer"
                          >
                            Release Outbreak →
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Section 2: Patient Geographic Area Breakdown Table */}
            <div className="space-y-3">
              <h4 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-teal-700" />
                <span>2. Geographic Area Summary (Where Patients Came From)</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {weeklyReport.locationsSummary.map((loc, idx) => (
                  <div key={idx} className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between font-bold">
                      <span className="text-slate-900 font-extrabold text-sm flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-teal-700" />
                        {loc.locationName}
                      </span>
                      <span className="bg-teal-100 text-teal-800 px-2 py-0.5 rounded-md font-mono">
                        {loc.totalPatients} Patients
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-600">
                      Top conditions:{' '}
                      {loc.topDiseases.map((td) => `${td.disease} (${td.count})`).join(', ')}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Section 3: Patient Log Table */}
            <div className="space-y-3">
              <h4 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-teal-700" />
                <span>3. Patient Encounter Log (Past 7 Days)</span>
              </h4>

              <div className="overflow-x-auto border border-slate-200 rounded-2xl max-h-56 overflow-y-auto">
                <table className="w-full text-left text-xs font-sans">
                  <thead className="bg-slate-100 text-slate-700 font-extrabold uppercase text-[10px] tracking-wider sticky top-0">
                    <tr>
                      <th className="p-2.5">UHID</th>
                      <th className="p-2.5">Patient Name</th>
                      <th className="p-2.5">Origin Area</th>
                      <th className="p-2.5">Diagnosis</th>
                      <th className="p-2.5">Date</th>
                      <th className="p-2.5">Doctor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {weeklyReport.rawEncounters.map((enc, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-2.5 font-mono text-slate-600">{enc.uhid}</td>
                        <td className="p-2.5 font-bold text-slate-900">{enc.patientName} ({enc.age}y/{enc.gender[0]})</td>
                        <td className="p-2.5 text-slate-700 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          {enc.villageCity}
                        </td>
                        <td className="p-2.5 font-bold text-teal-900">{enc.diagnosis}</td>
                        <td className="p-2.5 text-slate-500 font-mono">{new Date(enc.encounterDate).toLocaleDateString()}</td>
                        <td className="p-2.5 text-slate-600">{enc.attendingDoctor}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                onClick={() => setIsReportModalOpen(false)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl cursor-pointer"
              >
                Close Report
              </button>

              <button
                onClick={() => {
                  setIsReportModalOpen(false);
                  handleOpenGenericReleaseModal();
                }}
                className="flex items-center gap-2 px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-black text-xs rounded-xl shadow-md cursor-pointer"
              >
                <ShieldAlert className="w-4 h-4" />
                <span>Manually Release Outbreak Alert →</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MANUAL RELEASE OUTBREAK MODAL */}
      {isReleaseModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl space-y-5 border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center text-red-600">
                  <Radio className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900">
                    {currentLang === 'gu'
                      ? 'જાતે રોગચાળો એલર્ટ બહાર પાડો (Manual Release)'
                      : currentLang === 'hi'
                      ? 'स्वयं प्रकोप अलर्ट जारी करें (Manual Release)'
                      : 'Manually Release Outbreak Alert'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Released by staff member of <strong>{clinicProfile?.clinicName || 'Sanand CHC Hospital'}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsReleaseModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs font-sans">
              {/* Disease Name & Severity */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Infectious Disease</label>
                  <input
                    type="text"
                    value={formDiseaseNameEn}
                    onChange={(e) => setFormDiseaseNameEn(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 text-xs focus:ring-2 focus:ring-teal-500 outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Severity Risk Tier</label>
                  <select
                    value={formSeverity}
                    onChange={(e) => setFormSeverity(e.target.value as RiskLevel)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 text-xs focus:ring-2 focus:ring-teal-500 outline-hidden"
                  >
                    <option value="red">Red Alert (Confirmed Outbreak)</option>
                    <option value="orange">Orange Alert (Emerging Cluster)</option>
                    <option value="green">Green Alert (Watchlist Notice)</option>
                  </select>
                </div>
              </div>

              {/* Geographic Center & Radius */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Affected Sector / Village Area</label>
                  <input
                    type="text"
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 text-xs focus:ring-2 focus:ring-teal-500 outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Alert Radius: {formRadiusKm} km</label>
                  <input
                    type="range"
                    min="1"
                    max="20"
                    value={formRadiusKm}
                    onChange={(e) => setFormRadiusKm(Number(e.target.value))}
                    className="w-full accent-teal-600 mt-2"
                  />
                </div>
              </div>

              {/* Confirmed Cases & Releasing Staff Member Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Weekly Confirmed Cases at this Clinic</label>
                  <input
                    type="number"
                    min="1"
                    value={formCaseCount}
                    onChange={(e) => setFormCaseCount(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 text-xs focus:ring-2 focus:ring-teal-500 outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Releasing Staff / Doctor Name</label>
                  <input
                    type="text"
                    value={formStaffName}
                    onChange={(e) => setFormStaffName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 text-xs focus:ring-2 focus:ring-teal-500 outline-hidden"
                  />
                </div>
              </div>

              {/* Preventive Guidance */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Public Health Advisory to Citizens (Do's & Don'ts)</label>
                <textarea
                  rows={3}
                  value={formCustomGuidanceEn}
                  onChange={(e) => setFormCustomGuidanceEn(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:ring-2 focus:ring-teal-500 outline-hidden leading-relaxed"
                />
              </div>

              {/* Clinic Sign-Off Note */}
              <div className="bg-teal-50 rounded-xl p-3 border border-teal-200 text-[11px] text-teal-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-teal-600 shrink-0" />
                <span>
                  This alert will be broadcasted under authority of <strong>{clinicProfile?.clinicName || 'Sanand CHC Hospital'}</strong>.
                </span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsReleaseModalOpen(false)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleExecuteManualRelease}
                disabled={isPublishing}
                className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 active:scale-95 text-white font-black text-xs sm:text-sm rounded-xl shadow-lg transition cursor-pointer disabled:opacity-75"
              >
                {isPublishing ? (
                  <>
                    <Activity className="w-4 h-4 animate-spin text-white" />
                    <span>Releasing Outbreak Alert...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Confirm & Release Outbreak to Citizens →</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
