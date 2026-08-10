import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Hospital,
  Building2,
  Pill,
  Search,
  MapPin,
  Phone,
  PhoneCall,
  Navigation,
  RefreshCw,
  Pin,
  Filter,
  WifiOff,
  Globe,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import facilitiesDataRaw from '../data/facilities.json';
import { Facility, FacilityType, LanguageCode } from '../types';
import { getUserLocation, getSortedFacilities, UserCoordinates } from '../engine/location';

const rawFacilities = facilitiesDataRaw as Facility[];

interface NearbyScreenProps {
  initialSchemeFilter?: string;
  onBackToSchemes?: () => void;
}

export const NearbyScreen: React.FC<NearbyScreenProps> = ({
  initialSchemeFilter,
  onBackToSchemes
}) => {
  const { i18n } = useTranslation();
  const currentLang = (i18n.language || 'en') as LanguageCode;

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | FacilityType>('all');
  const [selectedScheme, setSelectedScheme] = useState<string>(initialSchemeFilter || 'all');
  const [userCoords, setUserCoords] = useState<UserCoordinates | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationStatus, setLocationStatus] = useState<'idle' | 'success' | 'denied'>('idle');
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [expandedPhoneFacilityId, setExpandedPhoneFacilityId] = useState<string | null>(null);

  // Monitor online / offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Request GPS position on initial load
  const requestLocation = async () => {
    setIsLocating(true);
    const coords = await getUserLocation();
    setIsLocating(false);
    if (coords) {
      setUserCoords(coords);
      setLocationStatus('success');
    } else {
      setLocationStatus('denied');
    }
  };

  useEffect(() => {
    requestLocation();
  }, []);

  // Compute distance-sorted facilities
  const sortedFacilities = getSortedFacilities(rawFacilities, userCoords);

  // Filter facilities by selected type, scheme filter & search query
  const filteredFacilities = sortedFacilities.filter((facility) => {
    const matchesType = selectedType === 'all' || facility.type === selectedType;
    const matchesScheme =
      selectedScheme === 'all' ||
      (facility.empanelled_schemes && facility.empanelled_schemes.includes(selectedScheme));
    const q = searchQuery.trim().toLowerCase();
    const matchesQuery =
      !q ||
      facility.name.toLowerCase().includes(q) ||
      facility.address.toLowerCase().includes(q);

    return matchesType && matchesScheme && matchesQuery;
  });

  // UI Localized strings
  const strings = {
    title:
      currentLang === 'gu'
        ? 'રિફરલ બોર્ડ અને નજીકના આરોગ્ય કેન્દ્રો'
        : currentLang === 'hi'
        ? 'रेफरल बोर्ड - निकटतम स्वास्थ्य केंद्र'
        : 'Referral Board & Nearby Help',
    subtitle:
      currentLang === 'gu'
        ? '૧૦૦% ઓફલાઈન ડિરેક્ટરી - ઈમરજન્સી કોલ માટે ઉપલબ્ધ'
        : currentLang === 'hi'
        ? '100% ऑफ़लाइन निर्देशिका - आपातकालीन कॉल हेतु तत्पर'
        : '100% Offline directory - One-tap calling available without internet',
    searchPlaceholder:
      currentLang === 'gu'
        ? 'હોસ્પિટલ, ક્લિનિક અથવા દવાની દુકાન શોધો...'
        : currentLang === 'hi'
        ? 'अस्पताल, क्लीनिक या दवा की दुकान खोजें...'
        : 'Search by facility name, area, address...',
    all: currentLang === 'gu' ? 'બધા' : currentLang === 'hi' ? 'सभी' : 'All',
    hospitals: currentLang === 'gu' ? 'હોસ્પિટલ' : currentLang === 'hi' ? 'अस्पताल' : 'Hospitals',
    clinics: currentLang === 'gu' ? 'ક્લિનિક' : currentLang === 'hi' ? 'क्लीनिक' : 'Clinics',
    pharmacies: currentLang === 'gu' ? 'મેડિકલ સ્ટોર' : currentLang === 'hi' ? 'दवा की दुकान' : 'Pharmacies',
    locating: currentLang === 'gu' ? 'GPS સ્થાન શોધી રહ્યું છે...' : currentLang === 'hi' ? 'GPS लोकेशन खोजी जा रही है...' : 'Detecting GPS Location...',
    locSuccess: currentLang === 'gu' ? 'GPS સ્થાન મળ્યું - અંતર મુજબ ગોઠવેલ' : currentLang === 'hi' ? 'GPS स्थान प्राप्त - दूरी के अनुसार सूचीबद्ध' : 'GPS Active - Sorted by Distance',
    locDenied: currentLang === 'gu' ? 'સ્થાન મળ્યું નથી. અલ્ફાબેટિક બતાવવામાં આવી રહ્યું છે.' : currentLang === 'hi' ? 'स्थान उपलब्ध नहीं। सभी केंद्र सूचीबद्ध हैं।' : 'Location not available. Showing all facilities.',
    detectLocBtn: currentLang === 'gu' ? 'મારું સ્થાન શોધો' : currentLang === 'hi' ? 'मेरा स्थान खोजें' : 'Detect Location',
    callNow: currentLang === 'gu' ? 'કોલ કરો' : currentLang === 'hi' ? 'कॉल करें' : 'Call Now',
    onlineDir: currentLang === 'gu' ? 'ઓનલાઈન રસ્તો' : currentLang === 'hi' ? 'ऑनलाइन दिशा-निर्देश' : 'Online Directions',
    offlineNote: currentLang === 'gu' ? 'ઈન્ટરનેટ જરૂરી છે' : currentLang === 'hi' ? 'इंटरनेट आवश्यक' : 'Requires internet',
    noResultsTitle: currentLang === 'gu' ? 'કોઈ આરોગ્ય કેન્દ્ર મળ્યું નથી' : currentLang === 'hi' ? 'कोई केंद्र नहीं मिला' : 'No facilities found',
    noResultsDesc: currentLang === 'gu' ? 'તમારી શોધ ખોટી અથવા અનુકૂળ નથી. કૃપા કરીને શોધ બદલો.' : currentLang === 'hi' ? 'कृपया खोज शब्द बदलें या फ़िल्टर हटाएं।' : 'Please check your search keywords or clear filters.',
    clearFilters: currentLang === 'gu' ? 'ફિલ્ટર કાઢી નાખો' : currentLang === 'hi' ? 'फ़िल्टर हटाएं' : 'Clear Filters',
    totalFacilities: currentLang === 'gu' ? 'કેન્દ્રો દર્શાવી રહ્યા છે' : currentLang === 'hi' ? 'कुल स्वास्थ्य केंद्र' : 'Facilities Listed'
  };

  const getTypeBadge = (type: FacilityType) => {
    switch (type) {
      case 'hospital':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
            <Hospital className="w-3.5 h-3.5 text-rose-600" />
            <span>{strings.hospitals}</span>
          </span>
        );
      case 'clinic':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-sky-100 text-sky-800 border border-sky-200">
            <Building2 className="w-3.5 h-3.5 text-sky-600" />
            <span>{strings.clinics}</span>
          </span>
        );
      case 'pharmacy':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <Pill className="w-3.5 h-3.5 text-emerald-600" />
            <span>{strings.pharmacies}</span>
          </span>
        );
    }
  };

  const getTypeBorderColor = (type: FacilityType) => {
    switch (type) {
      case 'hospital':
        return 'border-l-4 border-l-rose-500 hover:border-l-rose-600';
      case 'clinic':
        return 'border-l-4 border-l-sky-500 hover:border-l-sky-600';
      case 'pharmacy':
        return 'border-l-4 border-l-emerald-500 hover:border-l-emerald-600';
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-4 py-6 space-y-6 bg-[#F4F7F6] min-h-[calc(100vh-80px)] font-sans">
      {/* HEADER BANNER */}
      <div className="bg-[#1B4D4A] text-white rounded-2xl p-5 sm:p-6 shadow-card border border-[#2E7D73]/30 font-sans space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 bg-[#2E7D73]/50 px-3 py-1 rounded-lg text-xs font-mono font-bold text-[#B2DFD8] uppercase tracking-wider border border-[#B2DFD8]/20">
              <Hospital className="w-4 h-4 text-white" />
              <span>REFERRAL NETWORK & HEALTHCARE FACILITIES</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight font-display">
              {strings.title}
            </h2>
            <p className="text-xs sm:text-sm text-[#B2DFD8] font-sans leading-relaxed">
              {strings.subtitle}
            </p>
          </div>

          {/* GPS STATUS BADGE / TRIGGER */}
          <div className="shrink-0 bg-[#2E7D73] p-3.5 rounded-2xl border border-[#B2DFD8]/20 flex flex-col items-start md:items-end gap-1.5 min-w-[200px] font-sans shadow-xs">
            <div className="flex items-center gap-2 text-xs font-bold">
              {isLocating ? (
                <RefreshCw className="w-4 h-4 text-white animate-spin" />
              ) : userCoords ? (
                <CheckCircle2 className="w-4 h-4 text-[#B2DFD8]" />
              ) : (
                <AlertCircle className="w-4 h-4 text-[#B2DFD8]/60" />
              )}
              <span className="text-white">
                {isLocating
                  ? strings.locating
                  : userCoords
                  ? strings.locSuccess
                  : strings.locDenied}
              </span>
            </div>

            <button
              onClick={requestLocation}
              disabled={isLocating}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-white text-[#1B4D4A] hover:bg-[#F4F7F6] transition cursor-pointer disabled:opacity-50 shadow-xs"
            >
              <MapPin className="w-3.5 h-3.5 text-[#1B4D4A]" />
              <span>{strings.detectLocBtn}</span>
            </button>
          </div>
        </div>
      </div>

      {/* SEARCH & CATEGORY FILTERS CONTROLS */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#DDE3E2] shadow-card space-y-3 font-sans">
        {/* SEARCH INPUT */}
        <div className="relative font-sans">
          <Search className="w-4 h-4 text-[#5F6D6C] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={strings.searchPlaceholder}
            className="w-full pl-10 pr-4 py-3 bg-[#F4F7F6] rounded-xl border border-[#DDE3E2] text-[#1A2B2B] text-xs font-medium placeholder:text-[#5F6D6C] focus:outline-none focus:border-[#2E7D73]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#1B4D4A] bg-[#EDF1F0] px-2 py-0.5 rounded-lg font-bold"
            >
              CLEAR
            </button>
          )}
        </div>

        {/* CATEGORY FILTER PILLS */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 font-sans">
          <button
            onClick={() => setSelectedType('all')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
              selectedType === 'all'
                ? 'bg-[#2E7D73] text-white shadow-xs'
                : 'bg-[#F4F7F6] text-[#1A2B2B] border border-[#DDE3E2] hover:bg-[#EDF1F0]'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>{strings.all.toUpperCase()}</span>
            <span className="ml-1 text-[10px] px-1.5 bg-[#1B4D4A] text-white rounded-md">
              {rawFacilities.length}
            </span>
          </button>

          <button
            onClick={() => setSelectedType('hospital')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
              selectedType === 'hospital'
                ? 'bg-[#2E7D73] text-white shadow-xs'
                : 'bg-[#F4F7F6] text-[#1A2B2B] border border-[#DDE3E2] hover:bg-[#EDF1F0]'
            }`}
          >
            <Hospital className="w-4 h-4" />
            <span>{strings.hospitals.toUpperCase()}</span>
          </button>

          <button
            onClick={() => setSelectedType('clinic')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
              selectedType === 'clinic'
                ? 'bg-[#2E7D73] text-white shadow-xs'
                : 'bg-[#F4F7F6] text-[#1A2B2B] border border-[#DDE3E2] hover:bg-[#EDF1F0]'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>{strings.clinics.toUpperCase()}</span>
          </button>

          <button
            onClick={() => setSelectedType('pharmacy')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
              selectedType === 'pharmacy'
                ? 'bg-[#2E7D73] text-white shadow-xs'
                : 'bg-[#F4F7F6] text-[#1A2B2B] border border-[#DDE3E2] hover:bg-[#EDF1F0]'
            }`}
          >
            <Pill className="w-4 h-4" />
            <span>{strings.pharmacies.toUpperCase()}</span>
          </button>
        </div>

        {/* GOVT SCHEME FILTER ROW */}
        <div className="pt-2 border-t border-[#DDE3E2] font-sans">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold text-[#1B4D4A] uppercase tracking-wider flex items-center gap-1 font-display">
              <Globe className="w-3.5 h-3.5 text-[#2E7D73]" />
              <span>Empanelled Scheme Filter:</span>
            </span>
            {selectedScheme !== 'all' && (
              <button
                onClick={() => setSelectedScheme('all')}
                className="text-[10px] font-bold text-[#2E7D73] underline"
              >
                Clear scheme filter
              </button>
            )}
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {[
              { id: 'all', label: 'All Facilities' },
              { id: 'PMJAY', label: 'PM-JAY Ayushman' },
              { id: 'MA_MA_Vatsalya', label: 'MA Vatsalya' },
              { id: 'NTEP', label: 'NTEP Free TB' },
              { id: 'RAN', label: 'RAN Scheme' },
              { id: 'PMNDP', label: 'PMNDP Dialysis' }
            ].map((schemeItem) => (
              <button
                key={schemeItem.id}
                onClick={() => setSelectedScheme(schemeItem.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition shrink-0 cursor-pointer ${
                  selectedScheme === schemeItem.id
                    ? 'bg-[#1B4D4A] text-white shadow-xs'
                    : 'bg-[#EDF1F0] text-[#1A2B2B] border border-[#DDE3E2] hover:bg-[#DDE3E2]'
                }`}
              >
                {schemeItem.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* RESULTS COUNT SUMMARY */}
      <div className="flex items-center justify-between text-xs font-bold text-[#5F6D6C] px-1 font-sans">
        <span>
          MATCHING FACILITIES: <strong className="text-[#1B4D4A] font-display">{filteredFacilities.length}</strong>
        </span>
        {userCoords && (
          <span className="text-[#1B4D4A] flex items-center gap-1 font-bold">
            <MapPin className="w-3.5 h-3.5 text-[#2E7D73]" />
            Sorted by Proximity
          </span>
        )}
      </div>

      {/* FACILITY CARDS GRID / LIST */}
      {filteredFacilities.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-sans">
          {filteredFacilities.map((facility) => {
            const primaryPhone = facility.phone[0];
            const hasMultiplePhones = facility.phone.length > 1;
            const isPhoneExpanded = expandedPhoneFacilityId === facility.id;

            return (
              <div
                key={facility.id}
                className="bg-white rounded-2xl p-5 shadow-card hover:border-[#2E7D73] transition-all relative border border-[#DDE3E2] flex flex-col justify-between"
              >
                {/* TOP CARD CONTENT */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase bg-[#2E7D73] text-white">
                      {facility.type.toUpperCase()}
                    </span>

                    {facility.distanceKm !== undefined && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-[#EDF1F0] text-[#1B4D4A] text-xs font-bold border border-[#DDE3E2] shrink-0">
                        <MapPin className="w-3 h-3 text-[#2E7D73]" />
                        <span>{facility.distanceKm} km</span>
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="font-bold text-[#1B4D4A] text-base sm:text-lg leading-snug font-display">
                      {facility.name}
                    </h3>
                    <p className="text-xs text-[#5F6D6C] mt-1 flex items-start gap-1.5 leading-relaxed font-sans">
                      <MapPin className="w-3.5 h-3.5 text-[#2E7D73] shrink-0 mt-0.5" />
                      <span>{facility.address}</span>
                    </p>

                    {/* EMPANELLED SCHEMES BADGES */}
                    {facility.empanelled_schemes && facility.empanelled_schemes.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2.5 pt-2 border-t border-[#DDE3E2] font-sans">
                        {facility.empanelled_schemes.map((scheme) => (
                          <span
                            key={scheme}
                            className="inline-flex items-center gap-1 bg-[#EDF1F0] text-[#1B4D4A] text-[10px] font-bold px-2 py-0.5 rounded-md border border-[#DDE3E2]"
                          >
                            <Globe className="w-3 h-3 text-[#2E7D73]" />
                            <span>{scheme.replace(/_/g, ' ')}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* BOTTOM ACTION BUTTONS */}
                <div className="mt-5 pt-3 border-t border-[#DDE3E2] flex flex-col gap-2 font-sans">
                  <div className="flex items-center gap-2">
                    {/* ONE-TAP CALL BUTTON */}
                    <a
                      href={`tel:${primaryPhone}`}
                      className="flex-1 min-h-[40px] inline-flex items-center justify-center gap-2 bg-[#1B4D4A] hover:bg-[#2E7D73] text-white font-bold text-xs px-3.5 py-2 rounded-xl transition cursor-pointer shadow-xs"
                      title={`Call ${primaryPhone}`}
                    >
                      <PhoneCall className="w-4 h-4 text-white" />
                      <span>CALL: {primaryPhone}</span>
                    </a>

                    {/* DIRECTIONS LINK BUTTON */}
                    {isOnline ? (
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${facility.latitude},${facility.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="min-h-[40px] inline-flex items-center justify-center gap-1.5 bg-[#EDF1F0] hover:bg-[#DDE3E2] text-[#1B4D4A] font-bold text-xs px-3 py-2 rounded-xl border border-[#DDE3E2] transition cursor-pointer shrink-0"
                        title={strings.onlineDir}
                      >
                        <Navigation className="w-4 h-4 text-[#2E7D73]" />
                        <span className="hidden sm:inline">MAPS</span>
                      </a>
                    ) : (
                      <div
                        className="min-h-[40px] inline-flex items-center justify-center gap-1 bg-[#EDF1F0] text-[#5F6D6C] font-medium text-[10px] px-2.5 py-2 rounded-xl border border-[#DDE3E2] shrink-0"
                        title={strings.offlineNote}
                      >
                        <WifiOff className="w-3.5 h-3.5 text-[#5F6D6C]" />
                        <span>OFFLINE</span>
                      </div>
                    )}
                  </div>

                  {/* MULTIPLE PHONE NUMBERS EXPANDER */}
                  {hasMultiplePhones && (
                    <div className="pt-1">
                      <button
                        onClick={() =>
                          setExpandedPhoneFacilityId(
                            isPhoneExpanded ? null : facility.id
                          )
                        }
                        className="text-[10px] font-bold text-[#2E7D73] hover:underline flex items-center gap-1 focus:outline-none cursor-pointer"
                      >
                        <Phone className="w-3 h-3 text-[#2E7D73]" />
                        <span>
                          {isPhoneExpanded
                            ? 'Hide alternate numbers'
                            : `+${facility.phone.length - 1} alternate contact(s)`}
                        </span>
                        {isPhoneExpanded ? (
                          <ChevronUp className="w-3 h-3" />
                        ) : (
                          <ChevronDown className="w-3 h-3" />
                        )}
                      </button>

                      {isPhoneExpanded && (
                        <div className="mt-2 p-2.5 bg-[#F4F7F6] rounded-xl border border-[#DDE3E2] space-y-1.5">
                          <span className="text-[10px] font-bold text-[#1B4D4A] uppercase tracking-wider block font-display">
                            All Contact Numbers:
                          </span>
                          {facility.phone.map((num, idx) => (
                            <a
                              key={idx}
                              href={`tel:${num}`}
                              className="flex items-center justify-between text-xs font-bold text-[#1A2B2B] hover:bg-[#EDF1F0] p-1.5 rounded-lg transition"
                            >
                              <span className="inline-flex items-center gap-1.5">
                                <Phone className="w-3.5 h-3.5 text-[#2E7D73] shrink-0" />
                                <span>{num}</span>
                              </span>
                              <span className="text-[10px] text-white bg-[#1B4D4A] px-2 py-0.5 rounded-md font-bold">
                                Call
                              </span>
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* EMPTY STATE */
        <div className="bg-white rounded-2xl p-8 text-center space-y-4 border border-[#DDE3E2] shadow-card max-w-md mx-auto my-8 font-sans">
          <div className="w-16 h-16 rounded-2xl bg-[#1B4D4A] text-white flex items-center justify-center mx-auto shadow-xs">
            <Hospital className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-[#1B4D4A] font-display">{strings.noResultsTitle}</h3>
            <p className="text-xs text-[#5F6D6C] italic">{strings.noResultsDesc}</p>
          </div>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedType('all');
            }}
            className="px-4 py-2 bg-[#1B4D4A] hover:bg-[#2E7D73] text-white rounded-xl text-xs font-bold cursor-pointer transition shadow-xs"
          >
            {strings.clearFilters.toUpperCase()}
          </button>
        </div>
      )}
    </div>
  );
};
