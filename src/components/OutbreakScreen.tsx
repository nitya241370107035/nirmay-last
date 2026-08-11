import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  ShieldCheck,
  Search,
  MapPin,
  Bell,
  BellOff,
  ChevronDown,
  ChevronUp,
  Radio,
  Share2,
  CheckCircle2,
  Sparkles,
  Info,
  Activity,
  ArrowRight,
  RefreshCw,
  Lock,
  Crosshair,
  AlertCircle
} from 'lucide-react';
import { db } from '../db/db';
import { OutbreakAlert, LanguageCode } from '../types';
import {
  getSharingPreference,
  setSharingPreference,
  runOutbreakDetectionAndSync,
  getPrecautionsForDisease,
  requestNotificationPermission,
  calculateDistanceKm,
  queueCaseForSync
} from '../services/syncService';

// Default reference coordinates for user (Sanand / Anandpura, Gujarat)
const USER_CURRENT_COORDS = { lat: 22.99, lng: 72.37 };

interface RegionItem {
  name: string;
  lat: number;
  lng: number;
  isGps?: boolean;
}

const PREDEFINED_REGIONS: RegionItem[] = [
  { name: 'All Areas / Local', lat: 22.99, lng: 72.37 },
  { name: 'Sanand & Anandpura', lat: 22.99, lng: 72.37 },
  { name: 'West Ahmedabad', lat: 23.02, lng: 72.57 },
  { name: 'Rajkot Rural', lat: 22.30, lng: 70.80 },
  { name: 'Surat South', lat: 21.17, lng: 72.83 },
  { name: 'Vadodara Central', lat: 22.30, lng: 73.18 }
];

export const OutbreakScreen: React.FC = () => {
  const { i18n } = useTranslation();
  const currentLang = (i18n.language || 'en') as LanguageCode;

  const [alerts, setAlerts] = useState<OutbreakAlert[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedRegion, setSelectedRegion] = useState<RegionItem>(PREDEFINED_REGIONS[0]);
  const [expandedAlertId, setExpandedAlertId] = useState<string | null>(null);

  // GPS state
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Sharing & Notification preferences
  const [sharingEnabled, setSharingEnabled] = useState<boolean>(getSharingPreference());
  const [notificationsAllowed, setNotificationsAllowed] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  useEffect(() => {
    loadAlertsAndPermissions();
  }, []);

  useEffect(() => {
    refreshData();
  }, [selectedRegion]);

  const loadAlertsAndPermissions = async () => {
    try {
      if ('Notification' in window && Notification.permission === 'granted') {
        setNotificationsAllowed(true);
      }
      await refreshData();
    } catch (err) {
      console.error('Failed to load outbreak alerts', err);
    }
  };

  const refreshData = async (coordsOverride?: { lat: number; lng: number }) => {
    setIsRefreshing(true);
    try {
      await runOutbreakDetectionAndSync();
      const list = await db.alerts.where('status').equals('active').toArray();

      const activeLat = coordsOverride?.lat ?? selectedRegion.lat;
      const activeLng = coordsOverride?.lng ?? selectedRegion.lng;

      // Calculate distance for each alert from active location
      const withDist = list.map((a) => {
        const dist = calculateDistanceKm(
          activeLat,
          activeLng,
          a.center.lat,
          a.center.lng
        );
        return { ...a, distanceKm: dist };
      });

      // Sort by distance (closest first)
      withDist.sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0));
      setAlerts(withDist);
    } catch (err) {
      console.error('Sync failed', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleDetectGPS = () => {
    if (!('geolocation' in navigator)) {
      showToast(
        currentLang === 'gu'
          ? 'જીપીએસ બ્રાઉઝરમાં સપોર્ટેડ નથી'
          : currentLang === 'hi'
          ? 'जीपीएस ब्राउज़र में समर्थित नहीं है'
          : 'Geolocation is not supported by your browser'
      );
      return;
    }

    setIsLocating(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const coords = { lat, lng };
        setUserCoords(coords);
        setIsLocating(false);

        const gpsRegion: RegionItem = {
          name:
            currentLang === 'gu'
              ? `મારું જીપીએસ લોકેશન (${lat.toFixed(2)}, ${lng.toFixed(2)})`
              : currentLang === 'hi'
              ? `मेरा जीपीएस स्थान (${lat.toFixed(2)}, ${lng.toFixed(2)})`
              : `My Live GPS (${lat.toFixed(2)}, ${lng.toFixed(2)})`,
          lat,
          lng,
          isGps: true
        };

        setSelectedRegion(gpsRegion);
        refreshData(coords);

        showToast(
          currentLang === 'gu'
            ? 'જીપીએસ લોકેશન મળ્યું! નજીકના રોગચાળા ગણતરી થયા.'
            : currentLang === 'hi'
            ? 'जीपीएस स्थान प्राप्त हुआ! निकटतम प्रकोप की गणना की गई।'
            : 'Live GPS Position Detected! Nearest outbreaks calculated.'
        );
      },
      (err) => {
        console.warn('GPS detection error', err);
        setIsLocating(false);
        setGpsError(err.message || 'GPS location error');
        showToast(
          currentLang === 'gu'
            ? 'જીપીએસ સ્થાન મેળવી શકાયું નથી.'
            : currentLang === 'hi'
            ? 'जीपीएस स्थान प्राप्त करने में असमर्थ।'
            : 'Unable to acquire GPS location. Using default region.'
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  const handleToggleSharing = (enabled: boolean) => {
    setSharingEnabled(enabled);
    setSharingPreference(enabled);
    showToast(
      enabled
        ? currentLang === 'gu'
          ? 'અનામી આરોગ્ય ડેટા શેરિંગ ચાલુ થયું'
          : currentLang === 'hi'
          ? 'गुमनाम स्वास्थ्य डेटा साझाकरण सक्षम'
          : 'Anonymous data sharing enabled'
        : currentLang === 'gu'
        ? 'ડેટા શેરિંગ બંધ થયું'
        : currentLang === 'hi'
        ? 'डेटा साझाकरण अक्षम किया गया'
        : 'Anonymous data sharing disabled'
    );
  };

  const handleEnableNotifications = async () => {
    const granted = await requestNotificationPermission();
    setNotificationsAllowed(granted);
    if (granted) {
      showToast(
        currentLang === 'gu'
          ? 'પુશ નોટિફિકેશન મંજૂર થયું'
          : currentLang === 'hi'
          ? 'पुश नोटिफिकेशन सक्षम किया गया'
          : 'Outbreak Push Notifications Enabled!'
      );
    } else {
      showToast(
        currentLang === 'gu'
          ? 'નોટિફિકેશન મંજૂરી આપવામાં આવી નથી'
          : currentLang === 'hi'
          ? 'नोटिफिकेशन अनुमति अस्वीकृत'
          : 'Notification permission was not granted.'
      );
    }
  };

  const handleSimulateNewOutbreak = async () => {
    await queueCaseForSync(
      'dengue',
      'Dengue Mosquito Fever',
      'red',
      'Sanand Sector 4',
      { lat: 22.992, lng: 72.375 }
    );
    await refreshData();
    showToast(
      currentLang === 'gu'
        ? 'નવો ડેન્ગ્યુ ઉપદ્રવ એલર્ટ સફળતાપૂર્વક જનરેટ થયો!'
        : currentLang === 'hi'
        ? 'नया डेंगू प्रकोप अलर्ट सफलतापूर्वक उत्पन्न हुआ!'
        : 'Dengue Outbreak Cluster Alert Simulated!'
    );
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const filteredAlerts = alerts.filter((a) => {
    const diseaseStr = (
      a.diseaseName[currentLang] ||
      a.diseaseName.en ||
      ''
    ).toLowerCase();
    const villageStr = (a.center.villageName || '').toLowerCase();
    const q = searchQuery.toLowerCase();
    return diseaseStr.includes(q) || villageStr.includes(q);
  });

  const texts = {
    title:
      currentLang === 'gu'
        ? 'કોમ્યુનિટી રોગચાળા એલર્ટ (Outbreaks)'
        : currentLang === 'hi'
        ? 'सामुदायिक प्रकोप अलर्ट (Outbreaks)'
        : 'Community Outbreak Alerts & Surveillance',
    subtitle:
      currentLang === 'gu'
        ? 'રીઅલ-ટાઇમ ચેપી રોગ ટ્રેકિંગ અને સાવચેતીના પગલાં'
        : currentLang === 'hi'
        ? 'वास्तविक समय संक्रामक रोग ट्रैकिंग एवं सुरक्षा उपाय'
        : 'Real-time epidemic cluster detection & localized safety precautions',
    searchPlaceholder:
      currentLang === 'gu'
        ? 'વિસ્તાર, રોગ અથવા ગામનું નામ શોધો...'
        : currentLang === 'hi'
        ? 'क्षेत्र, बीमारी या गांव का नाम खोजें...'
        : 'Search area, disease, or village name...',
    checkAreaTitle:
      currentLang === 'gu'
        ? 'મુસાફરી પહેલાં વિસ્તાર તપાસો'
        : currentLang === 'hi'
        ? 'यात्रा से पहले क्षेत्र की जांच करें'
        : 'Check Area Outbreak Status Before Travel',
    noAlertsTitle:
      currentLang === 'gu'
        ? 'આ ક્ષેત્રમાં કોઈ સક્રિય રોગચાળો નથી!'
        : currentLang === 'hi'
        ? 'इस क्षेत्र में कोई सक्रिय प्रकोप नहीं है!'
        : 'No active disease outbreaks in this area!',
    noAlertsDesc:
      currentLang === 'gu'
        ? 'તમારા વિસ્તારમાં હાલમાં કોઈ ખતરનાક ક્લસ્ટર નોંધાયેલ નથી. સુરક્ષિત રહો!'
        : currentLang === 'hi'
        ? 'आपके क्षेत्र में वर्तमान में कोई खतरनाक क्लस्टर दर्ज नहीं है। सुरक्षित रहें!'
        : 'No major outbreak clusters reported in this vicinity. Stay safe!',
    showPrecautions:
      currentLang === 'gu'
        ? 'સાવચેતીના પગલાં જુઓ'
        : currentLang === 'hi'
        ? 'सुरक्षा सावधानियां देखें'
        : 'View Precautionary Measures',
    hidePrecautions:
      currentLang === 'gu'
        ? 'સાવચેતીના પગલાં સંતાડો'
        : currentLang === 'hi'
        ? 'सावधानियां छिपाएं'
        : 'Hide Precautions',
    privacyNotice:
      currentLang === 'gu'
        ? 'સંપૂર્ણ અનામી ડેટા: દર્દીનું નામ અથવા ઓળખ ક્યારેય શેર થતી નથી.'
        : currentLang === 'hi'
        ? 'पूर्णतः गुमनाम डेटा: रोगी का नाम या पहचान कभी साझा नहीं होती।'
        : 'Zero Identity Exposure: No patient names or addresses leave the device.',
    sharingToggleLabel:
      currentLang === 'gu'
        ? 'અનામી કેસ ડેટા શેરિંગ ચાલુ રાખો (સમુદાય સુરક્ષા માટે)'
        : currentLang === 'hi'
        ? 'गुमनाम केस डेटा साझाकरण सक्षम रखें (सामुदायिक सुरक्षा हेतु)'
        : 'Share anonymous case patterns for community early-warning',
    enablePushBtn:
      currentLang === 'gu'
        ? 'પુશ એલર્ટ ચાલુ કરો'
        : currentLang === 'hi'
        ? 'पुश अलर्ट सक्षम करें'
        : 'Enable Push Notifications',
    pushActive:
      currentLang === 'gu'
        ? 'પુશ એલર્ટ સક્રિય છે'
        : currentLang === 'hi'
        ? 'पुश अलर्ट सक्रिय हैं'
        : 'Push Notifications Active',
    detectGpsBtn:
      currentLang === 'gu'
        ? 'લાઇવ જીપીએસ વાપરો'
        : currentLang === 'hi'
        ? 'लाइव जीपीएस का उपयोग करें'
        : 'Use Live GPS Location',
    gpsActive:
      currentLang === 'gu'
        ? 'જીપીએસ સક્રિય છે'
        : currentLang === 'hi'
        ? 'जीपीएस सक्रिय है'
        : 'GPS Active',
    locating:
      currentLang === 'gu'
        ? 'સ્થાન શોધાઈ રહ્યું છે...'
        : currentLang === 'hi'
        ? 'स्थान खोजा जा रहा है...'
        : 'Locating via GPS...'
  };

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-4 py-6 space-y-6 bg-[#F4F7F6] min-h-[calc(100vh-80px)] font-sans">
      {/* Toast Banner */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#1B4D4A] text-white border border-[#2E7D73] px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-bold animate-bounce">
          <Sparkles className="w-5 h-5 text-[#B2DFD8]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Banner */}
      <div className="bg-[#1B4D4A] text-white rounded-2xl p-5 sm:p-6 shadow-card border border-[#2E7D73]/30 space-y-4 font-sans">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#2E7D73] text-white flex items-center justify-center shrink-0 font-bold text-xs shadow-xs">
              <Radio className="w-5 h-5 text-[#B2DFD8]" />
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#B2DFD8] block">
                EPIDEMIOLOGICAL SURVEILLANCE & OUTBREAK ALERTS
              </span>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight font-display">{texts.title}</h2>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 font-sans flex-wrap">
            {/* GPS TRIGGER BUTTON IN BANNER */}
            <button
              onClick={handleDetectGPS}
              disabled={isLocating}
              className={`px-3.5 py-2 font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs ${
                userCoords
                  ? 'bg-[#2E7D73] text-white border border-[#B2DFD8]/30'
                  : 'bg-white text-[#1B4D4A] hover:bg-[#F4F7F6]'
              }`}
            >
              {isLocating ? (
                <RefreshCw className="w-4 h-4 animate-spin text-[#1B4D4A]" />
              ) : (
                <Crosshair className={`w-4 h-4 ${userCoords ? 'text-[#B2DFD8]' : 'text-[#1B4D4A]'}`} />
              )}
              <span>{isLocating ? texts.locating : userCoords ? texts.gpsActive : texts.detectGpsBtn}</span>
            </button>

            <button
              onClick={() => refreshData()}
              disabled={isRefreshing}
              className="p-2.5 bg-[#2E7D73] hover:bg-[#1B4D4A] text-white rounded-xl transition cursor-pointer shadow-xs"
              title="Refresh active outbreaks"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>

            {!notificationsAllowed ? (
              <button
                onClick={handleEnableNotifications}
                className="px-3.5 py-2 bg-white text-[#1B4D4A] hover:bg-[#F4F7F6] font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Bell className="w-4 h-4 text-[#1B4D4A]" />
                <span className="hidden sm:inline">ENABLE NOTIFICATIONS</span>
              </button>
            ) : (
              <span className="px-3 py-1.5 bg-[#2E7D73] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs">
                <CheckCircle2 className="w-4 h-4 text-[#B2DFD8]" />
                <span className="hidden sm:inline">SURVEILLANCE ACTIVE</span>
              </span>
            )}
          </div>
        </div>

        {/* Region Selector & Privacy Safeguard Pill */}
        <div className="pt-3 border-t border-[#2E7D73]/30 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs font-sans">
          <div className="flex items-center gap-2 flex-wrap font-sans">
            <MapPin className="w-4 h-4 text-[#B2DFD8] shrink-0" />
            <span className="font-bold text-[#B2DFD8]">SURVEILLANCE REGION:</span>
            <select
              value={selectedRegion.name}
              onChange={(e) => {
                if (e.target.value === 'GPS_DETECT') {
                  handleDetectGPS();
                  return;
                }
                const found = PREDEFINED_REGIONS.find((r) => r.name === e.target.value);
                if (found) setSelectedRegion(found);
                else if (selectedRegion.isGps) {
                  // Keep current GPS
                }
              }}
              className="bg-white text-[#1B4D4A] font-bold px-3 py-1 rounded-xl text-xs focus:outline-none cursor-pointer border border-[#DDE3E2]"
            >
              {selectedRegion.isGps && (
                <option value={selectedRegion.name}>{selectedRegion.name}</option>
              )}
              {PREDEFINED_REGIONS.map((r) => (
                <option key={r.name} value={r.name}>
                  {r.name}
                </option>
              ))}
              {!selectedRegion.isGps && <option value="GPS_DETECT">📍 Use My Live GPS Location...</option>}
            </select>
          </div>

          <div className="flex items-center gap-2 text-[#B2DFD8] text-[11px] bg-[#2E7D73]/40 px-3 py-1 rounded-xl border border-[#B2DFD8]/20">
            <Lock className="w-3.5 h-3.5 text-[#B2DFD8] shrink-0" />
            <span>{texts.privacyNotice}</span>
          </div>
        </div>
      </div>

      {/* "Check Area Before Travel" Noticeboard Search & Region Pills */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#DDE3E2] shadow-card space-y-3 font-sans">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[#1B4D4A] font-bold text-sm sm:text-base font-display">
            <MapPin className="w-4 h-4 text-[#2E7D73]" />
            <span>{texts.checkAreaTitle.toUpperCase()}</span>
          </div>

          <button
            onClick={handleDetectGPS}
            disabled={isLocating}
            className="px-3 py-1 bg-[#EDF1F0] hover:bg-[#DDE3E2] text-[#1B4D4A] text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
          >
            <Crosshair className="w-3.5 h-3.5 text-[#2E7D73]" />
            <span>{isLocating ? texts.locating : texts.detectGpsBtn}</span>
          </button>
        </div>

        <div className="relative font-sans">
          <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-[#5F6D6C]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={texts.searchPlaceholder}
            className="w-full pl-10 pr-4 py-3 bg-[#F4F7F6] border border-[#DDE3E2] rounded-xl text-xs font-medium text-[#1A2B2B] placeholder-[#5F6D6C] focus:outline-none focus:border-[#2E7D73]"
          />
        </div>

        {/* Region selector pills including GPS button */}
        <div className="flex items-center gap-2 overflow-x-auto pt-1 pb-1 font-sans">
          <button
            onClick={handleDetectGPS}
            disabled={isLocating}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition cursor-pointer flex items-center gap-1.5 ${
              selectedRegion.isGps
                ? 'bg-[#1B4D4A] text-white shadow-xs'
                : 'bg-[#EDF1F0] text-[#1B4D4A] hover:bg-[#DDE3E2]'
            }`}
          >
            <Crosshair className="w-3.5 h-3.5 text-[#2E7D73]" />
            <span>{selectedRegion.isGps ? 'GPS Location Active' : '📍 Detect My GPS'}</span>
          </button>

          {PREDEFINED_REGIONS.map((reg) => (
            <button
              key={reg.name}
              onClick={() => setSelectedRegion(reg)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition cursor-pointer ${
                !selectedRegion.isGps && selectedRegion.name === reg.name
                  ? 'bg-[#2E7D73] text-white shadow-xs'
                  : 'bg-[#EDF1F0] text-[#1A2B2B] hover:bg-[#DDE3E2]'
              }`}
            >
              {reg.name}
            </button>
          ))}
        </div>
      </div>

      {/* Outbreak Alerts List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between font-sans">
          <h3 className="font-bold text-[#1B4D4A] text-base sm:text-lg flex items-center gap-2 font-display">
            <Activity className="w-5 h-5 text-[#2E7D73]" />
            <span>
              Active Regional Outbreak Clusters ({filteredAlerts.length})
            </span>
          </h3>

          {/* Test Simulation trigger for health workers */}
          <button
            onClick={handleSimulateNewOutbreak}
            className="text-xs font-bold text-[#1B4D4A] bg-[#EDF1F0] hover:bg-[#DDE3E2] px-3.5 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#2E7D73]" />
            <span>Simulate Outbreak Event</span>
          </button>
        </div>

        {filteredAlerts.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 text-center text-[#5F6D6C] border border-[#DDE3E2] shadow-card space-y-3 font-sans">
            <ShieldCheck className="w-12 h-12 mx-auto text-[#2E7D73]" />
            <h4 className="font-bold text-[#1B4D4A] text-base font-display">{texts.noAlertsTitle}</h4>
            <p className="text-xs font-sans max-w-sm mx-auto">{texts.noAlertsDesc}</p>
          </div>
        ) : (
          <div className="space-y-4 font-sans">
            {filteredAlerts.map((alert) => {
              const precautions = getPrecautionsForDisease(alert.diseaseId, currentLang);
              const isExpanded = expandedAlertId === alert.id;
              const isNearby = (alert.distanceKm ?? 999) <= 10;

              return (
                <div
                  key={alert.id}
                  className={`bg-white rounded-2xl border transition-all overflow-hidden shadow-card hover:border-[#2E7D73] ${
                    isNearby ? 'border-2 border-[#C46A3A]/60' : 'border-[#DDE3E2]'
                  }`}
                >
                  <div className="p-4 sm:p-5 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase text-white ${
                            alert.riskLevel === 'red' ? 'bg-[#B71C1C]' : 'bg-[#C46A3A]'
                          }`}>
                            {alert.riskLevel === 'red' ? 'CRITICAL OUTBREAK CLUSTER' : 'ACTIVE CLUSTER'}
                          </span>

                          {alert.distanceKm !== undefined && (
                            <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-lg inline-flex items-center gap-1 ${
                              isNearby
                                ? 'bg-[#C46A3A]/10 text-[#C46A3A] border border-[#C46A3A]/30'
                                : 'text-[#5F6D6C] bg-[#EDF1F0]'
                            }`}>
                              <MapPin className="w-3 h-3 text-[#2E7D73]" />
                              <span>{alert.distanceKm} km away {selectedRegion.isGps ? '(from GPS)' : ''}</span>
                            </span>
                          )}

                          {alert.contributingFacility && (
                            <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-lg bg-teal-100 text-teal-800 border border-teal-300 inline-flex items-center gap-1">
                              🛡️ Verified by {alert.contributingFacility.clinicName}
                            </span>
                          )}
                        </div>

                        <h4 className="font-bold text-base sm:text-lg text-[#1B4D4A] mt-1 font-display">
                          {alert.diseaseName[currentLang] || alert.diseaseName.en}
                        </h4>

                        <p className="text-xs text-[#5F6D6C] font-sans">
                          Location Sector: <strong>{alert.center.villageName || 'Local Village Sector'}</strong> ({alert.radiusKm} km radius)
                        </p>

                        {alert.affectedAreas && alert.affectedAreas.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-1">
                            {alert.affectedAreas.map((area, aIdx) => (
                              <span key={aIdx} className="text-[10px] bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded-md border border-slate-200">
                                📍 {area}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="text-right bg-[#EDF1F0] p-3 rounded-xl border border-[#DDE3E2] shrink-0">
                        <div className="text-lg font-bold text-[#1B4D4A] leading-tight font-display">
                          {alert.caseCount} CASES
                        </div>
                        <div className="text-[10px] text-[#5F6D6C] uppercase font-bold">
                          LAST 7 DAYS
                        </div>
                        {alert.weeklyGrowthPct && alert.weeklyGrowthPct > 0 && (
                          <div className="text-[10px] font-black text-red-600 mt-0.5">
                            +{alert.weeklyGrowthPct}% Surge
                          </div>
                        )}
                      </div>
                    </div>

                    {alert.customGuidance && (
                      <div className="bg-teal-50/80 p-2.5 rounded-xl border border-teal-200 text-xs text-teal-950 leading-relaxed">
                        💡 <strong>Hospital Advisory:</strong>{' '}
                        {alert.customGuidance[currentLang] || alert.customGuidance.en}
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-[#DDE3E2]">
                      <div className="text-xs text-[#5F6D6C] font-mono">
                        First logged: {new Date(alert.firstReported).toLocaleDateString()}
                      </div>

                      <button
                        onClick={() => setExpandedAlertId(isExpanded ? null : alert.id)}
                        className="px-3.5 py-1.5 bg-[#EDF1F0] hover:bg-[#DDE3E2] text-[#1B4D4A] text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <span>{isExpanded ? texts.hidePrecautions.toUpperCase() : texts.showPrecautions.toUpperCase()}</span>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-[#2E7D73]" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-[#2E7D73]" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Expandable Precautions & Prevention Panel */}
                  {isExpanded && (
                    <div className="bg-[#F4F7F6] border-t border-[#DDE3E2] p-4 sm:p-5 space-y-3 font-sans">
                      <div className="flex items-center gap-2 text-[#1B4D4A] font-bold text-sm font-display">
                        <ShieldCheck className="w-5 h-5 text-[#2E7D73]" />
                        <span>{precautions.title.toUpperCase()}</span>
                      </div>

                      <ul className="space-y-2">
                        {precautions.items.map((item, idx) => (
                          <li
                            key={idx}
                            className="flex items-start gap-2.5 text-xs text-[#1A2B2B] bg-white p-3 rounded-xl border border-[#DDE3E2] shadow-2xs"
                          >
                            <span className="w-5 h-5 rounded-lg bg-[#2E7D73] text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                              {idx + 1}
                            </span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
