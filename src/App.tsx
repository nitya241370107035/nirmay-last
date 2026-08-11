import React, { useState, useEffect, Suspense, lazy } from 'react';
import { I18nextProvider, useTranslation } from 'react-i18next';
import i18n from './i18n';
import { db } from './db/db';
import { Header } from './components/Header';
import { WelcomeScreen } from './components/WelcomeScreen';
import { CaseTaking } from './components/CaseTaking';
import { TriageResult } from './components/TriageResult';
import { FamilyRosterScreen } from './components/family/FamilyRosterScreen';
import { SelectFamilyScreen } from './components/family/SelectFamilyScreen';
import { SelectMemberScreen } from './components/family/SelectMemberScreen';
import { FollowUpsToday } from './components/FollowUpsToday';
import { InstallPrompt } from './components/InstallPrompt';
import { OfflineBanner } from './components/OfflineBanner';
import { evaluateCase } from './engine';
import { CaseData, TriageAssessment, LanguageCode, Patient, Family } from './types';
import { Stethoscope, Hospital, Activity, Users, Clock, Baby } from 'lucide-react';

import { NutritionScreeningModal } from './components/NutritionScreeningModal';

const InspirationalStories = lazy(() =>
  import('./components/InspirationalStories').then((m) => ({ default: m.InspirationalStories }))
);

const HealthArticles = lazy(() =>
  import('./components/HealthArticles').then((m) => ({ default: m.HealthArticles }))
);

const ChronicCareDashboard = lazy(() =>
  import('./components/chronic/ChronicCareDashboard').then((m) => ({ default: m.ChronicCareDashboard }))
);

const NearbyScreen = lazy(() =>
  import('./components/NearbyScreen').then((m) => ({ default: m.NearbyScreen }))
);

const OutbreakScreen = lazy(() =>
  import('./components/OutbreakScreen').then((m) => ({ default: m.OutbreakScreen }))
);

const SchemeChecker = lazy(() =>
  import('./components/SchemeChecker').then((m) => ({ default: m.SchemeChecker }))
);

const MCHDashboard = lazy(() =>
  import('./components/MCHDashboard').then((m) => ({ default: m.MCHDashboard }))
);

const AdherenceDashboard = lazy(() =>
  import('./components/adherence/AdherenceDashboard').then((m) => ({ default: m.AdherenceDashboard }))
);

const GardenInventoryManager = lazy(() =>
  import('./components/garden/GardenInventoryManager').then((m) => ({ default: m.GardenInventoryManager }))
);

const ClinicPortal = lazy(() =>
  import('./components/clinic/ClinicPortal').then((m) => ({ default: m.ClinicPortal }))
);

import { PortalSelectionScreen } from './components/PortalSelectionScreen';

type ViewState = 'welcome' | 'selectFamily' | 'selectMember' | 'caseTaking' | 'evaluating' | 'result' | 'nearby' | 'roster' | 'followups' | 'mch' | 'outbreak' | 'schemes' | 'stories' | 'articles' | 'adherence_tracker' | 'chronic_care' | 'garden_advisor';

function MainApp() {
  const { i18n: i18nInst } = useTranslation();
  const currentLang = (i18nInst.language || 'en') as LanguageCode;

  // Active Operating Portal: 'clinic' (150k Triage) or 'user' (Family Vault) or null (Gate)
  const [activePortal, setActivePortal] = useState<'clinic' | 'user' | null>(() => {
    return (localStorage.getItem('niramay_active_portal') as 'clinic' | 'user' | null) || null;
  });

  const [userMode, setUserMode] = useState<'patient' | 'healthWorker'>('patient');
  const [view, setView] = useState<ViewState>('welcome');
  const [activePatient, setActivePatient] = useState<Patient | null>(null);
  const [selectedFamily, setSelectedFamily] = useState<Family | null>(null);
  const [familyMembers, setFamilyMembers] = useState<Patient[]>([]);
  const [caseData, setCaseData] = useState<CaseData | null>(null);
  const [assessment, setAssessment] = useState<TriageAssessment | null>(null);

  // Scheme Checker & Nearby state
  const [schemeDiseaseId, setSchemeDiseaseId] = useState<string | null>(null);
  const [nearbySchemeFilter, setNearbySchemeFilter] = useState<string>('all');
  const [showNutritionModal, setShowNutritionModal] = useState<boolean>(false);

  useEffect(() => {
    const initSession = async () => {
      const mode = (localStorage.getItem('niramay_user_mode') as 'patient' | 'healthWorker') || 'patient';
      setUserMode(mode);

      if (mode === 'patient') {
        const savedFamilyId = localStorage.getItem('niramay_active_family_id');
        if (savedFamilyId) {
          const famId = Number(savedFamilyId);
          const fam = await db.families.get(famId);
          if (fam) {
            const members = await db.patients.where('familyId').equals(famId).toArray();
            setSelectedFamily(fam);
            setFamilyMembers(members);
            setView('welcome');
            return;
          }
        }
        // First screen when opened without selected family is Family Selection
        setView('selectFamily');
      } else {
        setView('welcome');
      }
    };

    initSession();
  }, []);

  const handleSwitchFamily = () => {
    localStorage.removeItem('niramay_active_family_id');
    localStorage.setItem('niramay_user_mode', 'patient');
    setUserMode('patient');
    setSelectedFamily(null);
    setFamilyMembers([]);
    setView('selectFamily');
  };

  const handleStartWithPatient = (patient: Patient) => {
    setActivePatient(patient);
    setView('caseTaking');
  };

  const handleCaseComplete = (data: CaseData) => {
    const updatedData: CaseData = {
      ...data,
      patientId: activePatient?.id || data.patientId
    };
    setCaseData(updatedData);
    setView('evaluating');

    // Simulate clinical engine computation & rule evaluation delay
    setTimeout(() => {
      const result = evaluateCase(updatedData, currentLang);
      setAssessment(result);
      setView('result');
    }, 450);
  };

  const handleCancelCase = () => {
    setView('welcome');
  };

  const handleNewCase = () => {
    setCaseData(null);
    setAssessment(null);
    setActivePatient(null);
    setSelectedFamily(null);
    setView('selectFamily');
  };

  const handleHomeClick = () => {
    setView('welcome');
  };

  const handleNearbyClick = () => {
    setView('nearby');
  };

  const handleRosterClick = () => {
    setView('roster');
  };

  const handleFollowUpsClick = () => {
    setView('followups');
  };

  const handleMchClick = () => {
    setView('mch');
  };

  const handleOutbreakClick = () => {
    setView('outbreak');
  };

  const handleStoriesClick = () => {
    setView('stories');
  };

  const handleArticlesClick = () => {
    setView('articles');
  };

  const handleSchemesClick = (diseaseId?: string) => {
    if (diseaseId) {
      setSchemeDiseaseId(diseaseId);
    }
    setView('schemes');
  };

  const handleSelectSchemeEmpanelledHospitals = (empanelmentType: string) => {
    setNearbySchemeFilter(empanelmentType);
    setView('nearby');
  };

  const bottomNavTriage =
    currentLang === 'gu'
      ? 'ટ્રાયજ'
      : currentLang === 'hi'
      ? 'स्वास्थ्य जांच'
      : 'Triage';

  const bottomNavRoster =
    currentLang === 'gu'
      ? 'કુટુંબ પત્રક'
      : currentLang === 'hi'
      ? 'परिवार रजिस्टर'
      : 'Family Roster';

  const bottomNavFollowUp =
    currentLang === 'gu'
      ? 'ફૉલો-અપ'
      : currentLang === 'hi'
      ? 'फॉलो-अप'
      : 'Follow-ups';

  const bottomNavMch =
    currentLang === 'gu'
      ? 'માતા-બાળ'
      : currentLang === 'hi'
      ? 'मातृ-शिशु'
      : 'MCH';

  const bottomNavOutbreak =
    currentLang === 'gu'
      ? 'રોગચાળો'
      : currentLang === 'hi'
      ? 'प्रकोप'
      : 'Outbreaks';

  const bottomNavNearby =
    currentLang === 'gu'
      ? 'નજીકના કેન્દ્રો'
      : currentLang === 'hi'
      ? 'નિકટતમ કેન્દ્ર'
      : 'Nearby Help';

  const evaluatingText =
    currentLang === 'gu'
      ? 'ક્લિનિકલ ગણતરી અને રોગ જોખમ મૂલ્યાંકન ચાલી રહ્યું છે...'
      : currentLang === 'hi'
      ? 'नैदानिक मूल्यांकन एवं जोखिम विश्लेषण किया जा रहा है...'
      : 'Evaluating clinical protocol & triage risk matrix...';

  if (!activePortal) {
    return (
      <PortalSelectionScreen
        onSelectPortal={(portal) => {
          localStorage.setItem('niramay_active_portal', portal);
          setActivePortal(portal);
        }}
      />
    );
  }

  if (activePortal === 'clinic') {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 font-sans">
        <Suspense
          fallback={
            <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center space-y-3 font-sans bg-slate-900 text-white">
              <div className="w-14 h-14 rounded-2xl bg-teal-800 text-teal-200 border border-teal-600 flex items-center justify-center animate-spin shadow-md">
                <Hospital className="w-7 h-7 text-teal-200" />
              </div>
              <p className="text-base font-bold text-teal-200 font-display">
                Loading Nirāmay Clinical Triage Portal (150k Encounter ML)...
              </p>
            </div>
          }
        >
          <ClinicPortal
            onSwitchPortal={() => {
              localStorage.removeItem('niramay_active_portal');
              setActivePortal(null);
            }}
          />
        </Suspense>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F7F6] text-[#1A2B2B] font-sans flex flex-col selection:bg-[#2E7D73] selection:text-white pb-16 md:pb-0">
      <OfflineBanner />
      <Header
        onHomeClick={handleHomeClick}
        onNearbyClick={handleNearbyClick}
        onRosterClick={handleRosterClick}
        onFollowUpsClick={handleFollowUpsClick}
        onMchClick={handleMchClick}
        onOutbreakClick={handleOutbreakClick}
        onSchemesClick={() => handleSchemesClick()}
        onStoriesClick={handleStoriesClick}
        onArticlesClick={handleArticlesClick}
        onAdherenceTrackerClick={() => setView('adherence_tracker')}
        onChronicCareClick={() => setView('chronic_care')}
        onGardenClick={() => setView('garden_advisor')}
        onSwitchPortal={() => {
          localStorage.removeItem('niramay_active_portal');
          setActivePortal(null);
        }}
        currentView={view}
        activeFamily={selectedFamily}
        userMode={userMode}
        onSwitchFamily={handleSwitchFamily}
      />

      <main className="flex-1">
        {view === 'welcome' && (
          <WelcomeScreen
            onStartCaseTaking={() => {
              if (selectedFamily) {
                setView('selectMember');
              } else {
                setView('selectFamily');
              }
            }}
            onOpenRoster={handleRosterClick}
            onOpenFollowUps={handleFollowUpsClick}
            onOpenMch={handleMchClick}
            onOpenOutbreaks={handleOutbreakClick}
            onOpenSchemes={() => handleSchemesClick()}
            onOpenStories={handleStoriesClick}
            onOpenArticles={handleArticlesClick}
            onOpenNutritionScreening={() => setShowNutritionModal(true)}
            onOpenAdherenceTracker={() => setView('adherence_tracker')}
            onOpenChronicCare={() => setView('chronic_care')}
            onOpenGardenAdvisor={() => setView('garden_advisor')}
            activeFamily={selectedFamily}
            userMode={userMode}
            onSwitchFamily={handleSwitchFamily}
          />
        )}

        {view === 'selectFamily' && (
          <SelectFamilyScreen
            onSelectFamily={(family, members) => {
              if (family.id) {
                localStorage.setItem('niramay_active_family_id', family.id.toString());
              }
              localStorage.setItem('niramay_user_mode', 'patient');
              setUserMode('patient');
              setSelectedFamily(family);
              setFamilyMembers(members);
              setView('welcome');
            }}
            onBackToHome={handleHomeClick}
            onEnterHealthWorkerMode={() => {
              localStorage.setItem('niramay_user_mode', 'healthWorker');
              setUserMode('healthWorker');
              setView('welcome');
            }}
          />
        )}

        {view === 'selectMember' && selectedFamily && (
          <SelectMemberScreen
            family={selectedFamily}
            members={familyMembers}
            onSelectMember={(patient) => {
              setActivePatient(patient);
              setView('caseTaking');
            }}
            onBackToFamilySelect={() => setView('selectFamily')}
            onMemberAdded={() => {
              // Family members updated
            }}
          />
        )}

        {view === 'caseTaking' && (
          <CaseTaking
            onComplete={handleCaseComplete}
            onCancel={handleCancelCase}
          />
        )}

        {view === 'evaluating' && (
          <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-[#2E7D73] text-white flex items-center justify-center shadow-md animate-pulse border-2 border-[#B2DFD8]">
              <Activity className="w-8 h-8 animate-spin text-[#B2DFD8]" />
            </div>
            <div className="space-y-1 max-w-sm font-sans">
              <h3 className="font-extrabold text-[#1B4D4A] text-base sm:text-lg font-display">
                Nirāmay Clinical Engine
              </h3>
              <p className="text-xs sm:text-sm text-[#5F6D6C] font-medium">
                {evaluatingText}
              </p>
            </div>
          </div>
        )}

        {view === 'result' && assessment && caseData && (
          <TriageResult
            assessment={assessment}
            caseData={caseData}
            onNewCase={handleNewCase}
            onOpenSchemeChecker={(diseaseId) => handleSchemesClick(diseaseId)}
            onOpenArticles={handleArticlesClick}
          />
        )}

        {view === 'roster' && (
          <FamilyRosterScreen
            onStartCaseForMember={(p) => {
              setActivePatient(p);
              setView('caseTaking');
            }}
            onBackToHome={handleHomeClick}
          />
        )}

        {view === 'followups' && (
          <FollowUpsToday
            onStartNewTriageForPatient={(p) => {
              setActivePatient(p);
              setView('caseTaking');
            }}
            onBackToHome={handleHomeClick}
            activeFamilyId={userMode === 'patient' ? selectedFamily?.id : undefined}
          />
        )}

        {view === 'mch' && (
          <Suspense
            fallback={
              <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center space-y-3 font-sans">
                <div className="w-12 h-12 rounded-2xl bg-[#1B4D4A] text-[#B2DFD8] border border-[#2E7D73] flex items-center justify-center animate-spin shadow-md">
                  <Baby className="w-6 h-6 text-[#B2DFD8]" />
                </div>
                <p className="text-xs font-bold text-[#1B4D4A] font-display">
                  Loading Maternal & Child Health Module...
                </p>
              </div>
            }
          >
            <MCHDashboard
              patient={activePatient}
              onClose={handleHomeClick}
            />
          </Suspense>
        )}

        {view === 'outbreak' && (
          <Suspense
            fallback={
              <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-[#1B4D4A] text-[#B2DFD8] border border-[#2E7D73] flex items-center justify-center animate-spin shadow-md">
                  <Activity className="w-6 h-6 text-[#B2DFD8]" />
                </div>
                <p className="text-xs font-bold text-[#1B4D4A] font-display">
                  Loading Community Outbreaks & GPS Alerts...
                </p>
              </div>
            }
          >
            <OutbreakScreen />
          </Suspense>
        )}

        {view === 'schemes' && (
          <Suspense
            fallback={
              <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-[#1B4D4A] text-[#B2DFD8] border border-[#2E7D73] flex items-center justify-center animate-spin shadow-md">
                  <Activity className="w-6 h-6 text-[#B2DFD8]" />
                </div>
                <p className="text-xs font-bold text-[#1B4D4A] font-display">
                  Loading Government Scheme Eligibility Engine...
                </p>
              </div>
            }
          >
            <SchemeChecker
              initialPatient={activePatient}
              initialDiseaseId={schemeDiseaseId}
              onSelectSchemeEmpanelledHospitals={handleSelectSchemeEmpanelledHospitals}
              onBackToHome={handleHomeClick}
            />
          </Suspense>
        )}

        {view === 'stories' && (
          <Suspense fallback={<div className="min-h-[50vh] flex items-center justify-center text-xs font-bold text-[#1B4D4A]">Loading Stories...</div>}>
            <InspirationalStories onBackToHome={handleHomeClick} />
          </Suspense>
        )}

        {view === 'articles' && (
          <Suspense fallback={<div className="min-h-[50vh] flex items-center justify-center text-xs font-bold text-[#1B4D4A]">Loading Health Articles...</div>}>
            <HealthArticles onBackToHome={handleHomeClick} />
          </Suspense>
        )}

        {view === 'adherence_tracker' && (
          <Suspense
            fallback={
              <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-700 text-white flex items-center justify-center animate-spin shadow-md">
                  <Activity className="w-6 h-6 text-emerald-200" />
                </div>
                <p className="text-xs font-bold text-slate-800 font-display">
                  Loading DOT Medication Adherence & Wellness Tracker...
                </p>
              </div>
            }
          >
            <AdherenceDashboard
              initialPatient={activePatient}
              currentLang={currentLang}
              onBackToHome={handleHomeClick}
              activeFamilyId={userMode === 'patient' ? selectedFamily?.id : undefined}
            />
          </Suspense>
        )}

        {view === 'chronic_care' && (
          <Suspense
            fallback={
              <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-[#0F3835] text-emerald-300 flex items-center justify-center animate-spin shadow-md">
                  <Activity className="w-6 h-6 text-emerald-300" />
                </div>
                <p className="text-xs font-bold text-[#0F3835] font-display">
                  Loading Chronic Care & Glycemic Dashboard...
                </p>
              </div>
            }
          >
            <ChronicCareDashboard
              activePatient={activePatient}
              onBack={handleHomeClick}
            />
          </Suspense>
        )}

        {view === 'garden_advisor' && (
          <Suspense
            fallback={
              <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-800 text-white flex items-center justify-center animate-spin shadow-md">
                  <Activity className="w-6 h-6 text-emerald-200" />
                </div>
                <p className="text-xs font-bold text-slate-800 font-display">
                  Loading Medicinal Plant Garden Advisor...
                </p>
              </div>
            }
          >
            <GardenInventoryManager onBack={handleHomeClick} />
          </Suspense>
        )}


        {view === 'nearby' && (
          <Suspense
            fallback={
              <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-[#1B4D4A] text-[#B2DFD8] border border-[#2E7D73] flex items-center justify-center animate-spin shadow-md">
                  <Hospital className="w-6 h-6 text-[#B2DFD8]" />
                </div>
                <p className="text-xs font-bold text-[#1B4D4A] font-display">
                  Loading Healthcare Referral Network...
                </p>
              </div>
            }
          >
            <NearbyScreen
              initialSchemeFilter={nearbySchemeFilter}
              onBackToSchemes={() => setView('schemes')}
            />
          </Suspense>
        )}
      </main>

      <NutritionScreeningModal
        isOpen={showNutritionModal}
        onClose={() => setShowNutritionModal(false)}
        patient={activePatient}
        onSelectPatient={(p) => setActivePatient(p)}
        onOpenArticle={(artId) => {
          setShowNutritionModal(false);
          setView('articles');
        }}
      />

      <InstallPrompt />

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-[#DDE3E2] shadow-lg z-40 py-2 px-2 flex items-center justify-around sm:hidden">
        <button
          onClick={handleHomeClick}
          className={`flex flex-col items-center gap-0.5 text-[10px] font-extrabold transition cursor-pointer ${
            view === 'welcome' || view === 'caseTaking' || view === 'result'
              ? 'text-[#1B4D4A] font-black'
              : 'text-[#5F6D6C] hover:text-[#1B4D4A]'
          }`}
        >
          <Stethoscope className="w-4 h-4" />
          <span>{bottomNavTriage}</span>
        </button>

        <button
          onClick={handleRosterClick}
          className={`flex flex-col items-center gap-0.5 text-[10px] font-extrabold transition cursor-pointer ${
            view === 'roster' ? 'text-[#1B4D4A] font-black' : 'text-[#5F6D6C] hover:text-[#1B4D4A]'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>{bottomNavRoster}</span>
        </button>

        <button
          onClick={handleFollowUpsClick}
          className={`flex flex-col items-center gap-0.5 text-[10px] font-extrabold transition cursor-pointer ${
            view === 'followups' ? 'text-[#C46A3A] font-black' : 'text-[#5F6D6C] hover:text-[#1B4D4A]'
          }`}
        >
          <Clock className="w-4 h-4 text-[#C46A3A]" />
          <span>{bottomNavFollowUp}</span>
        </button>

        <button
          onClick={handleMchClick}
          className={`flex flex-col items-center gap-0.5 text-[10px] font-extrabold transition cursor-pointer ${
            view === 'mch' ? 'text-[#1B4D4A] font-black' : 'text-[#5F6D6C] hover:text-[#1B4D4A]'
          }`}
        >
          <Baby className="w-4 h-4 text-[#2E7D73]" />
          <span>{bottomNavMch}</span>
        </button>

        <button
          onClick={handleOutbreakClick}
          className={`flex flex-col items-center gap-0.5 text-[10px] font-extrabold transition cursor-pointer ${
            view === 'outbreak' ? 'text-[#B71C1C] font-black' : 'text-[#5F6D6C] hover:text-[#1B4D4A]'
          }`}
        >
          <Activity className="w-4 h-4 text-[#B71C1C]" />
          <span>{bottomNavOutbreak}</span>
        </button>

        <button
          onClick={handleNearbyClick}
          className={`flex flex-col items-center gap-0.5 text-[10px] font-extrabold transition cursor-pointer ${
            view === 'nearby' ? 'text-[#2E7D73] font-black' : 'text-[#5F6D6C] hover:text-[#1B4D4A]'
          }`}
        >
          <Hospital className="w-4 h-4 text-[#2E7D73]" />
          <span>{bottomNavNearby}</span>
        </button>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <I18nextProvider i18n={i18n}>
      <MainApp />
    </I18nextProvider>
  );
}
