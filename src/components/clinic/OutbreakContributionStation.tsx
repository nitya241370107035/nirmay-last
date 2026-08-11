import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Radio,
  AlertTriangle,
  ShieldAlert,
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
  Flame,
  Clock,
  Eye
} from 'lucide-react';
import { RiskLevel, LanguageCode, OutbreakAlert } from '../../types';
import { ClinicProfile } from './ClinicLogin';
import {
  analyzeWeeklyClinicOutbreaks,
  publishOutbreakAlert,
  resolveOutbreakAlert,
  DetectedDiseaseCluster,
  OutbreakPublishPayload,
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
  const [clusters, setClusters] = useState<DetectedDiseaseCluster[]>([]);
  const [stats, setStats] = useState<{
    weeklyTotalEncounters: number;
    infectiousSurgeCount: number;
    redAlertClustersCount: number;
    orangeAlertClustersCount: number;
    activePublishedAlerts: OutbreakAlert[];
  }>({
    weeklyTotalEncounters: 0,
    infectiousSurgeCount: 0,
    redAlertClustersCount: 0,
    orangeAlertClustersCount: 0,
    activePublishedAlerts: []
  });

  // Modal State for Broadcasting Alert
  const [selectedClusterForPublish, setSelectedClusterForPublish] = useState<DetectedDiseaseCluster | null>(null);
  const [isCustomModalOpen, setIsCustomModalOpen] = useState<boolean>(false);
  const [isPublishing, setIsPublishing] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form State for Broadcast
  const [formDiseaseId, setFormDiseaseId] = useState<string>('dengue');
  const [formDiseaseNameEn, setFormDiseaseNameEn] = useState<string>('Dengue Mosquito Fever');
  const [formLocation, setFormLocation] = useState<string>('Sanand & Anandpura');
  const [formRadiusKm, setFormRadiusKm] = useState<number>(5);
  const [formCaseCount, setFormCaseCount] = useState<number>(5);
  const [formSeverity, setFormSeverity] = useState<RiskLevel>('red');
  const [formGrowthPct, setFormGrowthPct] = useState<number>(150);
  const [formDoctorName, setFormDoctorName] = useState<string>(clinicProfile?.doctorName || 'Dr. Devang Mehta, MD');
  const [formCustomGuidanceEn, setFormCustomGuidanceEn] = useState<string>(
    'Urgent dengue mosquito breeding containment advisory. Clean stagnant water, sleep under bed nets and report fever immediately.'
  );

  useEffect(() => {
    loadSurveillanceData();
  }, []);

  const loadSurveillanceData = async () => {
    setLoading(true);
    try {
      const data = await analyzeWeeklyClinicOutbreaks(clinicProfile?.facilityCode);
      setClusters(data.clusters);
      setStats({
        weeklyTotalEncounters: data.weeklyTotalEncounters,
        infectiousSurgeCount: data.infectiousSurgeCount,
        redAlertClustersCount: data.redAlertClustersCount,
        orangeAlertClustersCount: data.orangeAlertClustersCount,
        activePublishedAlerts: data.activePublishedAlerts
      });
    } catch (e) {
      console.error('Failed to load epidemiological surveillance data', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleManualRefresh = () => {
    setRefreshing(true);
    loadSurveillanceData();
  };

  // Open Publish Modal for an auto-detected cluster
  const handleOpenPublishModal = (cluster: DetectedDiseaseCluster) => {
    setSelectedClusterForPublish(cluster);
    setFormDiseaseId(cluster.diseaseId);
    setFormDiseaseNameEn(cluster.diseaseName.en);
    setFormLocation(cluster.primaryLocation);
    setFormRadiusKm(cluster.suggestedRadiusKm);
    setFormCaseCount(cluster.weeklyCaseCount);
    setFormSeverity(cluster.severity);
    setFormGrowthPct(cluster.growthRatePct);
    setFormDoctorName(clinicProfile?.doctorName || 'Dr. Devang Mehta, MD');
    setFormCustomGuidanceEn(cluster.clinicalGuidance.en);
    setIsCustomModalOpen(true);
  };

  // Execute Broadcast to Community Network
  const handleExecuteBroadcast = async () => {
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
        affectedAreas: selectedClusterForPublish?.affectedLocations.map((a) => a.name) || [formLocation],
        customGuidance: {
          en: formCustomGuidanceEn,
          hi: formCustomGuidanceEn,
          gu: formCustomGuidanceEn
        },
        contributingFacility: {
          clinicName: clinicProfile?.clinicName || 'Sanand Community Health Center & General Hospital',
          facilityCode: clinicProfile?.facilityCode || 'CHC-SAN-01',
          doctorName: formDoctorName
        }
      };

      await publishOutbreakAlert(payload);
      setToastMessage(
        currentLang === 'gu'
          ? '✅ રોગચાળો ચેતવણી સફળતાપૂર્વક નાગરિક નેટવર્ક પર પ્રસારિત કરવામાં આવી!'
          : currentLang === 'hi'
          ? '✅ प्रकोप चेतावनी सफलतापूर्वक नागरिक नेटवर्क पर प्रसारित की गई!'
          : '✅ Outbreak Alert successfully broadcasted to Citizen Health Network!'
      );
      setIsCustomModalOpen(false);
      setSelectedClusterForPublish(null);
      await loadSurveillanceData();
    } catch (e) {
      console.error('Failed to broadcast outbreak alert', e);
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
          ? 'ℹ️ રોગચાળો ચેતવણી ઉકેલાયેલ તરીકે ચિહ્નિત થયેલ છે.'
          : currentLang === 'hi'
          ? 'ℹ️ प्रकोप चेतावनी हल के रूप में चिह्नित की गई।'
          : 'ℹ️ Outbreak Alert marked as resolved.'
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

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#072421] via-[#0C3833] to-[#124B45] text-white rounded-3xl p-5 sm:p-7 shadow-xl border border-teal-500/20 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-500/20 text-red-300 border border-red-400/30 rounded-full text-[11px] font-mono font-black uppercase tracking-wider">
                <Radio className="w-3.5 h-3.5 animate-pulse text-red-400" />
                {currentLang === 'gu' ? 'એપિડેમિક સેન્ટિનેલ નેટવર્ક' : currentLang === 'hi' ? 'महामारी निगरानी नेटवर्क' : 'Epidemic Sentinel Hub'}
              </span>
              <span className="text-xs font-bold text-teal-200 bg-white/10 px-2.5 py-0.5 rounded-full">
                7-Day Rolling EMR Analysis
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              {currentLang === 'gu'
                ? 'હોસ્પિટલ રોગચાળો મોનિટરિંગ અને કમ્યુનિટી એલર્ટ'
                : currentLang === 'hi'
                ? 'अस्पताल प्रकोप निगरानी एवं नागरिक अलर्ट प्रणाली'
                : 'Hospital Outbreak Surveillance & Community Alert Hub'}
            </h2>

            <p className="text-xs sm:text-sm text-teal-100/80 max-w-2xl">
              {currentLang === 'gu'
                ? 'સાપ્તાહિક દર્દીઓના નિદાન અને રહેઠાણ વિસ્તારના આધારે સ્થાનિક રોગચાળાનું વિશ્લેષણ કરો અને નાગરિક પોર્ટલ પર પુષ્ટિ થયેલ ચેતવણીઓ પ્રસારિત કરો.'
                : currentLang === 'hi'
                ? 'साप्ताहिक मरीज निदान एवं निवास स्थान के आधार पर स्थानीय प्रकोपों का विश्लेषण करें और नागरिक ऐप पर सत्यापित चेतावनी प्रसारित करें।'
                : 'Analyze weekly patient diagnoses & geographic origin to detect infectious disease clusters and broadcast verified alerts directly to citizen vaults.'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleManualRefresh}
              disabled={refreshing}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-white/10 hover:bg-white/20 active:scale-95 text-white font-bold text-xs sm:text-sm rounded-xl border border-white/20 shadow-sm transition cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span>{currentLang === 'gu' ? 'રિફ્રેશ કરો' : currentLang === 'hi' ? 'रिफ्रेश' : 'Refresh'}</span>
            </button>

            <button
              onClick={() => {
                setSelectedClusterForPublish(null);
                setFormDiseaseId('dengue');
                setFormDiseaseNameEn('Dengue Mosquito Fever');
                setFormLocation('Sanand & Anandpura');
                setFormRadiusKm(5);
                setFormCaseCount(5);
                setFormSeverity('red');
                setIsCustomModalOpen(true);
              }}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 active:scale-95 text-white font-black text-xs sm:text-sm rounded-xl shadow-lg transition cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>{currentLang === 'gu' ? '+ નવું એલર્ટ બહાર પાડો' : currentLang === 'hi' ? '+ नया अलर्ट जारी करें' : '+ Broadcast New Alert'}</span>
            </button>
          </div>
        </div>

        {/* Live Surveillance KPI Counters */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/10">
            <div className="flex items-center justify-between text-teal-200 text-xs font-bold">
              <span>{currentLang === 'gu' ? 'સાપ્તાહિક કેસો' : currentLang === 'hi' ? 'साप्ताहिक कुल केस' : 'Weekly Encounters'}</span>
              <Users className="w-4 h-4 text-cyan-400" />
            </div>
            <p className="text-2xl font-black text-white mt-1">{stats.weeklyTotalEncounters}</p>
            <span className="text-[10px] text-teal-300">Past 7 days EMR intake</span>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/10">
            <div className="flex items-center justify-between text-amber-200 text-xs font-bold">
              <span>{currentLang === 'gu' ? 'સક્રિય ક્લસ્ટર્સ' : currentLang === 'hi' ? 'सक्रिय क्लस्टर' : 'Infectious Clusters'}</span>
              <Activity className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-2xl font-black text-amber-300 mt-1">{stats.infectiousSurgeCount}</p>
            <span className="text-[10px] text-amber-200">Surge threshold detected</span>
          </div>

          <div className="bg-red-500/20 backdrop-blur-md rounded-2xl p-3.5 border border-red-500/30">
            <div className="flex items-center justify-between text-red-200 text-xs font-bold">
              <span>{currentLang === 'gu' ? 'રેડ એલર્ટ આઉટબ્રેક' : currentLang === 'hi' ? 'रेड अलर्ट प्रकोप' : 'Red Alert Outbreaks'}</span>
              <Flame className="w-4 h-4 text-red-400" />
            </div>
            <p className="text-2xl font-black text-red-200 mt-1">{stats.redAlertClustersCount}</p>
            <span className="text-[10px] text-red-300">≥ 5 cases in same sector</span>
          </div>

          <div className="bg-emerald-500/20 backdrop-blur-md rounded-2xl p-3.5 border border-emerald-500/30">
            <div className="flex items-center justify-between text-emerald-200 text-xs font-bold">
              <span>{currentLang === 'gu' ? 'લાઇવ સિટીઝન એલર્ટ' : currentLang === 'hi' ? 'लाइव नागरिक अलर्ट' : 'Live Community Alerts'}</span>
              <Radio className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-2xl font-black text-emerald-200 mt-1">{stats.activePublishedAlerts.length}</p>
            <span className="text-[10px] text-emerald-300">Broadcasted to citizens</span>
          </div>
        </div>
      </div>

      {/* Main Content Grid: Auto-Detected Hotspots vs Active Published Bulletins */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Auto-Detected Hotspot Clusters */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-teal-700" />
              <h3 className="text-base sm:text-lg font-black text-slate-900">
                {currentLang === 'gu' ? 'સ્વચાલિત પકડાયેલા રોગચાળાના હોટસ્પોટ્સ' : currentLang === 'hi' ? 'स्वचालित पहचाने गए प्रकोप हॉटस्पॉट' : 'Auto-Detected Epidemiological Hotspots'}
              </h3>
            </div>
            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
              {clusters.length} {currentLang === 'gu' ? 'ક્લસ્ટર્સ' : currentLang === 'hi' ? 'क्लस्टर' : 'Clusters'}
            </span>
          </div>

          {loading ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm space-y-3">
              <Activity className="w-8 h-8 text-teal-600 animate-spin mx-auto" />
              <p className="text-sm font-bold text-slate-600">
                {currentLang === 'gu' ? 'સાપ્તાહિક કેસોનું વિશ્લેષણ થઈ રહ્યું છે...' : currentLang === 'hi' ? 'साप्ताहिक केसों का विश्लेषण हो रहा है...' : 'Analyzing weekly EMR encounter logs by disease and location...'}
              </p>
            </div>
          ) : clusters.length === 0 ? (
            <div className="bg-white rounded-2xl p-10 text-center border border-slate-200 shadow-sm space-y-2">
              <ShieldCheck className="w-10 h-10 text-emerald-600 mx-auto" />
              <h4 className="text-base font-extrabold text-slate-900">No Active Outbreak Clusters Detected</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Weekly case counts are currently below epidemic alert thresholds across all registered sectors.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {clusters.map((cluster) => {
                const isRed = cluster.severity === 'red';
                const isOrange = cluster.severity === 'orange';

                return (
                  <div
                    key={cluster.clusterId}
                    className={`bg-white rounded-2xl p-5 border-2 transition-all shadow-sm space-y-4 ${
                      isRed
                        ? 'border-red-500/40 bg-gradient-to-br from-red-50/30 via-white to-rose-50/20'
                        : isOrange
                        ? 'border-amber-500/40 bg-gradient-to-br from-amber-50/30 via-white to-orange-50/20'
                        : 'border-slate-200'
                    }`}
                  >
                    {/* Card Header */}
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-black uppercase tracking-wider flex items-center gap-1 ${
                              isRed
                                ? 'bg-red-600 text-white'
                                : isOrange
                                ? 'bg-amber-600 text-white'
                                : 'bg-emerald-600 text-white'
                            }`}
                          >
                            {isRed ? '🔴 CONFIRMED OUTBREAK' : isOrange ? '🟠 EMERGING CLUSTER' : '🟢 WATCHLIST'}
                          </span>
                          <span className="text-xs font-bold text-slate-600 flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            {cluster.primaryLocation}
                          </span>
                        </div>

                        <h4 className="text-base sm:text-lg font-black text-slate-900">
                          {cluster.diseaseName?.[currentLang] || cluster.diseaseName?.en}
                        </h4>
                      </div>

                      <div className="text-right">
                        <div className="flex items-baseline gap-1 justify-end">
                          <span className="text-2xl font-black text-slate-900">{cluster.weeklyCaseCount}</span>
                          <span className="text-xs font-bold text-slate-500">cases</span>
                        </div>
                        {cluster.growthRatePct > 0 && (
                          <span className="text-[11px] font-extrabold text-red-600 flex items-center gap-0.5 justify-end">
                            <TrendingUp className="w-3 h-3" /> +{cluster.growthRatePct}% vs last wk
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Geographic breakdown */}
                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80 text-xs space-y-1.5">
                      <div className="flex items-center justify-between text-slate-600 font-bold">
                        <span>Affected Localities & Patient Origins:</span>
                        <span className="text-slate-400">Radius: ~{cluster.suggestedRadiusKm} km</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {cluster.affectedLocations.map((loc, idx) => (
                          <span key={idx} className="bg-white px-2 py-0.5 rounded-md border border-slate-200 text-slate-700 font-semibold text-[11px]">
                            📍 {loc.name} ({loc.count} cases)
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Clinical Guidance Text */}
                    <p className="text-xs text-slate-600 bg-teal-50/50 p-2.5 rounded-xl border border-teal-200/60 leading-relaxed">
                      💡 <strong className="text-teal-950">Clinical Advisory:</strong>{' '}
                      {cluster.clinicalGuidance?.[currentLang] || cluster.clinicalGuidance?.en}
                    </p>

                    {/* Action Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-100">
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> First case: {new Date(cluster.firstEncounterDate).toLocaleDateString()}
                      </span>

                      <div className="flex items-center gap-2">
                        {cluster.isAlreadyPublished ? (
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-800 text-xs font-extrabold rounded-xl">
                              <Check className="w-4 h-4 text-emerald-600" />
                              {currentLang === 'gu' ? 'લાઈવ પ્રસારિત' : currentLang === 'hi' ? 'लाइव प्रसारित' : 'Live on Citizen Network'}
                            </span>
                            {cluster.publishedAlertId && (
                              <button
                                onClick={() => handleResolveAlert(cluster.publishedAlertId!)}
                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
                              >
                                {currentLang === 'gu' ? 'ઉકેલો' : currentLang === 'hi' ? 'समाप्त करें' : 'Resolve'}
                              </button>
                            )}
                          </div>
                        ) : (
                          <button
                            onClick={() => handleOpenPublishModal(cluster)}
                            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 active:scale-95 text-white font-extrabold text-xs rounded-xl shadow-md transition cursor-pointer"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>
                              {currentLang === 'gu'
                                ? '⚡ નાગરિકો માટે એલર્ટ બહાર પાડો'
                                : currentLang === 'hi'
                                ? '⚡ नागरिकों के लिए अलर्ट जारी करें'
                                : '⚡ Broadcast Alert to Citizens'}
                            </span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right 1 Column: Active Published Community Alerts */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Radio className="w-5 h-5 text-emerald-600" />
              <h3 className="text-base sm:text-lg font-black text-slate-900">
                {currentLang === 'gu' ? 'સક્રિય લાઇવ બુલેટિન' : currentLang === 'hi' ? 'सक्रिय लाइव बुलेटिन' : 'Live Broadcasts'}
              </h3>
            </div>
            <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
              {stats.activePublishedAlerts.length} Active
            </span>
          </div>

          {stats.activePublishedAlerts.length === 0 ? (
            <div className="bg-white rounded-2xl p-6 text-center border border-slate-200 shadow-sm space-y-2">
              <Info className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-xs font-bold text-slate-500">No active alerts published yet.</p>
              <p className="text-[11px] text-slate-400">
                Click "+ Broadcast New Alert" or use an auto-detected hotspot to alert citizens.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {stats.activePublishedAlerts.map((alert) => (
                <div key={alert.id} className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3 hover:border-teal-500/40 transition">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span
                        className={`text-[9px] font-mono font-black uppercase px-2 py-0.5 rounded-full ${
                          alert.riskLevel === 'red' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {alert.riskLevel.toUpperCase()} ALERT
                      </span>
                      <h4 className="text-sm font-extrabold text-slate-900 mt-1">
                        {alert.diseaseName?.[currentLang] || alert.diseaseName?.en}
                      </h4>
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        {alert.center?.villageName || 'Sanand Sector'} (~{alert.radiusKm} km)
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-lg font-black text-slate-900">{alert.caseCount}</span>
                      <span className="text-[10px] text-slate-400 block">cases</span>
                    </div>
                  </div>

                  {alert.contributingFacility && (
                    <div className="text-[10px] text-teal-800 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-100 flex items-center gap-1.5">
                      <Building2 className="w-3 h-3 text-teal-600" />
                      <span>Verified by: {alert.contributingFacility.clinicName}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[11px]">
                    <span className="text-slate-400">
                      {new Date(alert.lastReported).toLocaleDateString()}
                    </span>
                    <button
                      onClick={() => handleResolveAlert(alert.id)}
                      className="text-rose-600 hover:text-rose-700 font-bold cursor-pointer"
                    >
                      Resolve Alert
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Quick Info Box */}
          <div className="bg-gradient-to-br from-teal-50 to-emerald-50 rounded-2xl p-4 border border-teal-200/60 text-xs space-y-2 text-teal-950">
            <div className="flex items-center gap-1.5 font-bold">
              <ShieldCheck className="w-4 h-4 text-teal-700" />
              <span>How Outbreak Alerts Reach Citizens</span>
            </div>
            <p className="text-[11px] text-teal-800 leading-relaxed">
              When published, alerts immediately appear on the Citizen Outbreak Center with interactive GPS maps, safety precautions, and emergency helpline cards.
            </p>
          </div>
        </div>
      </div>

      {/* Broadcast Alert Modal Form */}
      {isCustomModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl space-y-5 border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-red-100 flex items-center justify-center text-red-600">
                  <Radio className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900">
                    {currentLang === 'gu' ? 'નાગરિક સમુદાય ચેતવણી પ્રસારિત કરો' : currentLang === 'hi' ? 'नागरिक समुदाय चेतावनी प्रसारित करें' : 'Broadcast Community Outbreak Alert'}
                  </h3>
                  <p className="text-xs text-slate-500">Verified by Hospital Epidemiological Sentinel</p>
                </div>
              </div>
              <button
                onClick={() => setIsCustomModalOpen(false)}
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
                  <label className="font-bold text-slate-700">Surge Severity Level</label>
                  <select
                    value={formSeverity}
                    onChange={(e) => setFormSeverity(e.target.value as RiskLevel)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 text-xs focus:ring-2 focus:ring-teal-500 outline-hidden"
                  >
                    <option value="red">🔴 Red Alert (Confirmed Epidemic)</option>
                    <option value="orange">🟠 Orange Alert (Emerging Cluster)</option>
                    <option value="green">🟢 Green Alert (Watchlist Notice)</option>
                  </select>
                </div>
              </div>

              {/* Geographic Center & Radius */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Affected Sector / Village</label>
                  <input
                    type="text"
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 text-xs focus:ring-2 focus:ring-teal-500 outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Alert Radius (km): {formRadiusKm} km</label>
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

              {/* Case Count & Growth */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Weekly Confirmed Cases</label>
                  <input
                    type="number"
                    min="1"
                    value={formCaseCount}
                    onChange={(e) => setFormCaseCount(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 text-xs focus:ring-2 focus:ring-teal-500 outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Attending Doctor / Officer</label>
                  <input
                    type="text"
                    value={formDoctorName}
                    onChange={(e) => setFormDoctorName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 text-xs focus:ring-2 focus:ring-teal-500 outline-hidden"
                  />
                </div>
              </div>

              {/* Preventive Guidance */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Community Health Advisory (Do's & Don'ts)</label>
                <textarea
                  rows={3}
                  value={formCustomGuidanceEn}
                  onChange={(e) => setFormCustomGuidanceEn(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:ring-2 focus:ring-teal-500 outline-hidden leading-relaxed"
                />
              </div>

              {/* Verification Attribution Note */}
              <div className="bg-teal-50 rounded-xl p-3 border border-teal-200 text-[11px] text-teal-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-teal-600 shrink-0" />
                <span>
                  Alert will be tagged with verification badge from <strong>{clinicProfile?.clinicName || 'Sanand CHC Hospital'}</strong>.
                </span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsCustomModalOpen(false)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleExecuteBroadcast}
                disabled={isPublishing}
                className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 active:scale-95 text-white font-black text-xs sm:text-sm rounded-xl shadow-lg transition cursor-pointer disabled:opacity-75"
              >
                {isPublishing ? (
                  <>
                    <Activity className="w-4 h-4 animate-spin text-white" />
                    <span>Broadcasting Alert...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Confirm & Broadcast Alert →</span>
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
