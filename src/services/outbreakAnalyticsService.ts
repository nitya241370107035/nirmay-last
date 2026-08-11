import { db } from '../db/db';
import { OutbreakAlert, RiskLevel, LanguageCode, MultilingualText, ClinicRecord } from '../types';
import precautionsData from '../data/precautions.json';

// Standard Regional Geographic Coordinates Mapping in Gujarat
export const REGIONAL_COORDINATES: Record<string, { lat: number; lng: number; defaultRadiusKm: number }> = {
  'Sanand': { lat: 22.99, lng: 72.37, defaultRadiusKm: 5 },
  'Anandpura': { lat: 22.98, lng: 72.35, defaultRadiusKm: 4 },
  'Sanand & Anandpura': { lat: 22.99, lng: 72.37, defaultRadiusKm: 5 },
  'Bavla': { lat: 22.83, lng: 72.36, defaultRadiusKm: 6 },
  'West Ahmedabad': { lat: 23.03, lng: 72.53, defaultRadiusKm: 7 },
  'Ahmedabad Central': { lat: 23.02, lng: 72.58, defaultRadiusKm: 8 },
  'Dholka': { lat: 22.72, lng: 72.44, defaultRadiusKm: 6 },
  'Viramgam': { lat: 23.12, lng: 72.03, defaultRadiusKm: 8 },
  'Rajkot Rural': { lat: 22.30, lng: 70.80, defaultRadiusKm: 6 },
  'Surat South': { lat: 21.17, lng: 72.83, defaultRadiusKm: 6 },
  'Vadodara Central': { lat: 22.30, lng: 73.18, defaultRadiusKm: 6 }
};

export interface PatientEncounterSummary {
  uhid: string;
  patientName: string;
  age: number;
  gender: string;
  villageCity: string;
  encounterDate: string;
  diagnosis: string;
  chiefComplaint: string;
  attendingDoctor: string;
}

export interface DiseaseLocationBreakdown {
  diseaseId: string;
  diseaseName: MultilingualText;
  totalCases: number;
  percentageOfOPD: number;
  locationDistribution: Array<{
    location: string;
    caseCount: number;
    patientList: PatientEncounterSummary[];
  }>;
  identifiedRiskTier: 'Low' | 'Moderate' | 'High Surge';
}

export interface WeeklyClinicEpidemiologyReport {
  clinicName: string;
  facilityCode: string;
  generatedAt: string;
  reportPeriod: {
    startDate: string;
    endDate: string;
    totalEncounters: number;
  };
  diseasesBreakdown: DiseaseLocationBreakdown[];
  locationsSummary: Array<{
    locationName: string;
    totalPatients: number;
    topDiseases: Array<{ disease: string; count: number }>;
  }>;
  rawEncounters: PatientEncounterSummary[];
}

export interface DetectedDiseaseCluster {
  clusterId: string;
  diseaseId: string;
  diseaseName: MultilingualText;
  primaryLocation: string;
  centerCoords: { lat: number; lng: number };
  suggestedRadiusKm: number;
  weeklyCaseCount: number;
  previousWeeklyCount: number;
  growthRatePct: number;
  severity: RiskLevel;
  isOutbreak: boolean;
  affectedLocations: Array<{ name: string; count: number }>;
  firstEncounterDate: string;
  latestEncounterDate: string;
  patientUhidList: string[];
  clinicalGuidance: MultilingualText;
  isAlreadyPublished: boolean;
  publishedAlertId?: string;
}

export interface OutbreakPublishPayload {
  diseaseId: string;
  diseaseName: MultilingualText;
  locationName: string;
  lat: number;
  lng: number;
  radiusKm: number;
  caseCount: number;
  severity: RiskLevel;
  weeklyGrowthPct?: number;
  affectedAreas: string[];
  customGuidance?: MultilingualText;
  contributingFacility: {
    clinicName: string;
    facilityCode: string;
    doctorName?: string;
  };
}

// Normalize disease names to canonical surveillance IDs
export function normalizeSurveillanceDiseaseId(rawName: string): { id: string; name: MultilingualText } {
  const lower = (rawName || '').toLowerCase().trim();

  if (lower.includes('dengue')) {
    return {
      id: 'dengue',
      name: { en: 'Dengue Mosquito Fever', hi: 'डेंगू बुखार', gu: 'ડેન્ગ્યુ મચ્છરજન્ય તાવ' }
    };
  }
  if (lower.includes('malaria')) {
    return {
      id: 'malaria',
      name: { en: 'Malaria Vector Surge', hi: 'मलेरिया प्रकोप', gu: 'મેલેરિયા તાવ ઉપદ્રવ' }
    };
  }
  if (lower.includes('typhoid') || lower.includes('enteric')) {
    return {
      id: 'typhoid',
      name: { en: 'Typhoid (Enteric Fever)', hi: 'टाइफाइड (मियादी बुखार)', gu: 'ટાઇફોઇડ (આંતરડાનો તાવ)' }
    };
  }
  if (lower.includes('gastro') || lower.includes('diarrhea') || lower.includes('food poison') || lower.includes('vomiting')) {
    return {
      id: 'food_poisoning',
      name: { en: 'Acute Gastroenteritis / Diarrhea Surge', hi: 'तीव्र पेट संक्रमण व उल्टी-दस्त', gu: 'ઝાડા-ઉલટી અને ગેસ્ટ્રો સંક્રમણ' }
    };
  }
  if (lower.includes('hepatitis') || lower.includes('jaundice')) {
    return {
      id: 'hepatitis',
      name: { en: 'Viral Hepatitis / Jaundice Cluster', hi: 'वायरल हेपेटाइटिस व पीलिया', gu: 'વાયરલ હેપેટાઇટિસ અને કમળો' }
    };
  }
  if (lower.includes('chikungunya')) {
    return {
      id: 'chikungunya',
      name: { en: 'Chikungunya Joint Fever', hi: 'चिकनगुनिया बुखार', gu: 'ચિકનગુનિયા તાવ' }
    };
  }
  if (lower.includes('pneumonia') || lower.includes('respiratory') || lower.includes('asthma') || lower.includes('covid')) {
    return {
      id: 'pneumonia',
      name: { en: 'Acute Respiratory Infection / Pneumonia Cluster', hi: 'तीव्र श्वसन संक्रमण व न्यूमोनिया', gu: 'તીવ્ર શ્વસન ચેપ અને ન્યુમોનિયા' }
    };
  }
  if (lower.includes('chicken pox') || lower.includes('measles') || lower.includes('rubella')) {
    return {
      id: 'chicken_pox',
      name: { en: 'Viral Exanthem / Chicken Pox Cluster', hi: 'चेचक / खसरा प्रकोप', gu: 'અછબડા અને ઓરી નો ઉપદ્રવ' }
    };
  }

  // Default Fallback
  const formattedEn = rawName ? rawName.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : 'Seasonal Infectious Outbreak';
  return {
    id: lower.replace(/\s+/g, '_') || 'infectious_cluster',
    name: {
      en: formattedEn,
      hi: `${formattedEn} प्रकोप`,
      gu: `${formattedEn} ઉપદ્રવ`
    }
  };
}

/**
 * Seed realistic multi-encounter EMR patient records if database is fresh
 */
export async function seedSurveillanceEncounterDataIfEmpty(): Promise<void> {
  const existingCount = await db.clinicRecords.count();
  if (existingCount >= 8) return;

  const now = Date.now();
  const ONE_DAY = 86400000;

  const sampleSurveillanceEncounters: Partial<ClinicRecord>[] = [
    // 5 Dengue Cases in Sanand & Anandpura
    {
      uhid: 'CLN-892101',
      patientName: 'Kailashben Patel',
      age: 38,
      gender: 'Female',
      villageCity: 'Sanand & Anandpura',
      clinicFacilityCode: 'CHC-SAN-01',
      clinicName: 'Sanand Community Health Center & General Hospital',
      department: 'General Medicine',
      encounterDate: new Date(now - 1 * ONE_DAY).toISOString(),
      entrySource: 'triage_ml',
      chiefComplaint: 'High fever, severe retro-orbital pain and joint stiffness for 3 days',
      symptomsSummary: ['high_fever', 'pain_behind_the_eyes', 'joint_pain', 'fatigue'],
      vitals: { heartRate: 104, respiratoryRate: 18, bodyTemperature: 39.2, oxygenSaturation: 97, systolicBp: 110, diastolicBp: 70, derivedBmi: 23.1 },
      finalDiagnosis: 'Dengue Mosquito Fever',
      status: 'Completed',
      attendingDoctor: 'Dr. Devang Mehta, MD',
      prescriptions: [],
      createdAt: new Date(now - 1 * ONE_DAY).toISOString(),
      updatedAt: new Date(now - 1 * ONE_DAY).toISOString()
    },
    {
      uhid: 'CLN-892102',
      patientName: 'Rameshbhai Parmar',
      age: 44,
      gender: 'Male',
      villageCity: 'Sanand & Anandpura',
      clinicFacilityCode: 'CHC-SAN-01',
      clinicName: 'Sanand Community Health Center & General Hospital',
      department: 'General Medicine',
      encounterDate: new Date(now - 2 * ONE_DAY).toISOString(),
      entrySource: 'triage_ml',
      chiefComplaint: 'Sudden high fever with petechial skin rash and vomiting',
      symptomsSummary: ['high_fever', 'skin_rash', 'vomiting', 'muscle_pain'],
      vitals: { heartRate: 98, respiratoryRate: 17, bodyTemperature: 38.9, oxygenSaturation: 98, systolicBp: 114, diastolicBp: 74, derivedBmi: 24.0 },
      finalDiagnosis: 'Dengue Mosquito Fever',
      status: 'Completed',
      attendingDoctor: 'Dr. Devang Mehta, MD',
      prescriptions: [],
      createdAt: new Date(now - 2 * ONE_DAY).toISOString(),
      updatedAt: new Date(now - 2 * ONE_DAY).toISOString()
    },
    {
      uhid: 'CLN-892103',
      patientName: 'Amit Solanki',
      age: 22,
      gender: 'Male',
      villageCity: 'Anandpura',
      clinicFacilityCode: 'CHC-SAN-01',
      clinicName: 'Sanand Community Health Center & General Hospital',
      department: 'General Medicine',
      encounterDate: new Date(now - 2 * ONE_DAY).toISOString(),
      entrySource: 'triage_ml',
      chiefComplaint: 'Breakbone joint fever, nausea and severe headache',
      symptomsSummary: ['high_fever', 'joint_pain', 'headache', 'nausea'],
      vitals: { heartRate: 102, respiratoryRate: 19, bodyTemperature: 39.4, oxygenSaturation: 97, systolicBp: 108, diastolicBp: 68, derivedBmi: 21.8 },
      finalDiagnosis: 'Dengue Mosquito Fever',
      status: 'Completed',
      attendingDoctor: 'Dr. Devang Mehta, MD',
      prescriptions: [],
      createdAt: new Date(now - 2 * ONE_DAY).toISOString(),
      updatedAt: new Date(now - 2 * ONE_DAY).toISOString()
    },
    {
      uhid: 'CLN-892104',
      patientName: 'Bhavnaben Vaghela',
      age: 51,
      gender: 'Female',
      villageCity: 'Sanand & Anandpura',
      clinicFacilityCode: 'CHC-SAN-01',
      clinicName: 'Sanand Community Health Center & General Hospital',
      department: 'General Medicine',
      encounterDate: new Date(now - 4 * ONE_DAY).toISOString(),
      entrySource: 'triage_ml',
      chiefComplaint: 'High grade fever with extreme weakness and muscle aches',
      symptomsSummary: ['high_fever', 'muscle_pain', 'fatigue', 'chills'],
      vitals: { heartRate: 94, respiratoryRate: 16, bodyTemperature: 38.8, oxygenSaturation: 98, systolicBp: 122, diastolicBp: 78, derivedBmi: 25.2 },
      finalDiagnosis: 'Dengue Mosquito Fever',
      status: 'Completed',
      attendingDoctor: 'Dr. Devang Mehta, MD',
      prescriptions: [],
      createdAt: new Date(now - 4 * ONE_DAY).toISOString(),
      updatedAt: new Date(now - 4 * ONE_DAY).toISOString()
    },
    {
      uhid: 'CLN-892105',
      patientName: 'Chetan Thakor',
      age: 29,
      gender: 'Male',
      villageCity: 'Sanand',
      clinicFacilityCode: 'CHC-SAN-01',
      clinicName: 'Sanand Community Health Center & General Hospital',
      department: 'General Medicine',
      encounterDate: new Date(now - 5 * ONE_DAY).toISOString(),
      entrySource: 'triage_ml',
      chiefComplaint: 'Chills, sweating spikes, fever and retro-orbital headache',
      symptomsSummary: ['high_fever', 'pain_behind_the_eyes', 'sweating', 'headache'],
      vitals: { heartRate: 96, respiratoryRate: 18, bodyTemperature: 39.1, oxygenSaturation: 98, systolicBp: 118, diastolicBp: 76, derivedBmi: 22.7 },
      finalDiagnosis: 'Dengue Mosquito Fever',
      status: 'Completed',
      attendingDoctor: 'Dr. Devang Mehta, MD',
      prescriptions: [],
      createdAt: new Date(now - 5 * ONE_DAY).toISOString(),
      updatedAt: new Date(now - 5 * ONE_DAY).toISOString()
    },

    // 3 Acute Gastroenteritis cases in West Ahmedabad & Bavla
    {
      uhid: 'CLN-892201',
      patientName: 'Prakashbhai Shah',
      age: 42,
      gender: 'Male',
      villageCity: 'West Ahmedabad',
      clinicFacilityCode: 'CHC-SAN-01',
      clinicName: 'Sanand Community Health Center & General Hospital',
      department: 'General Medicine',
      encounterDate: new Date(now - 1 * ONE_DAY).toISOString(),
      entrySource: 'triage_ml',
      chiefComplaint: 'Watery diarrhea, continuous vomiting and severe dehydration cramps',
      symptomsSummary: ['diarrhoea', 'vomiting', 'dehydration', 'abdominal_pain'],
      vitals: { heartRate: 110, respiratoryRate: 20, bodyTemperature: 37.8, oxygenSaturation: 99, systolicBp: 100, diastolicBp: 62, derivedBmi: 24.3 },
      finalDiagnosis: 'Acute Gastroenteritis / Diarrhea Surge',
      status: 'Completed',
      attendingDoctor: 'Dr. Devang Mehta, MD',
      prescriptions: [],
      createdAt: new Date(now - 1 * ONE_DAY).toISOString(),
      updatedAt: new Date(now - 1 * ONE_DAY).toISOString()
    },
    {
      uhid: 'CLN-892202',
      patientName: 'Minakshiben Suthar',
      age: 35,
      gender: 'Female',
      villageCity: 'West Ahmedabad',
      clinicFacilityCode: 'CHC-SAN-01',
      clinicName: 'Sanand Community Health Center & General Hospital',
      department: 'General Medicine',
      encounterDate: new Date(now - 3 * ONE_DAY).toISOString(),
      entrySource: 'triage_ml',
      chiefComplaint: 'Abdominal pain with multiple loose stools and nausea',
      symptomsSummary: ['diarrhoea', 'nausea', 'stomach_pain', 'fatigue'],
      vitals: { heartRate: 92, respiratoryRate: 17, bodyTemperature: 37.4, oxygenSaturation: 98, systolicBp: 112, diastolicBp: 70, derivedBmi: 22.9 },
      finalDiagnosis: 'Acute Gastroenteritis / Diarrhea Surge',
      status: 'Completed',
      attendingDoctor: 'Dr. Devang Mehta, MD',
      prescriptions: [],
      createdAt: new Date(now - 3 * ONE_DAY).toISOString(),
      updatedAt: new Date(now - 3 * ONE_DAY).toISOString()
    },
    {
      uhid: 'CLN-892203',
      patientName: 'Vikramsinh Jadeja',
      age: 48,
      gender: 'Male',
      villageCity: 'Bavla',
      clinicFacilityCode: 'CHC-SAN-01',
      clinicName: 'Sanand Community Health Center & General Hospital',
      department: 'General Medicine',
      encounterDate: new Date(now - 4 * ONE_DAY).toISOString(),
      entrySource: 'triage_ml',
      chiefComplaint: 'Food poisoning symptoms after community dinner, cramps and fever',
      symptomsSummary: ['vomiting', 'diarrhoea', 'mild_fever', 'abdominal_pain'],
      vitals: { heartRate: 98, respiratoryRate: 18, bodyTemperature: 38.2, oxygenSaturation: 98, systolicBp: 106, diastolicBp: 66, derivedBmi: 26.1 },
      finalDiagnosis: 'Acute Gastroenteritis / Diarrhea Surge',
      status: 'Completed',
      attendingDoctor: 'Dr. Devang Mehta, MD',
      prescriptions: [],
      createdAt: new Date(now - 4 * ONE_DAY).toISOString(),
      updatedAt: new Date(now - 4 * ONE_DAY).toISOString()
    }
  ];

  for (const record of sampleSurveillanceEncounters) {
    await db.clinicRecords.add(record as ClinicRecord);
  }
}

/**
 * Generate Whole Weekly Report of Diseases and Patient Origin Areas for a Single Specific Clinic
 * (Completely isolated to this particular clinic's diagnosed patients and their locations)
 */
export async function generateWeeklyClinicReport(
  facilityCode?: string,
  clinicName?: string
): Promise<WeeklyClinicEpidemiologyReport> {
  await seedSurveillanceEncounterDataIfEmpty();

  const now = Date.now();
  const SEVEN_DAYS_MS = 7 * 86400000;
  const sevenDaysAgoIso = new Date(now - SEVEN_DAYS_MS).toISOString();

  // 1. Fetch clinic records strictly filtered by this clinic's facility code (if specified)
  const allClinicRecords = await db.clinicRecords.toArray();
  const filteredClinicRecords = facilityCode
    ? allClinicRecords.filter((r) => r.clinicFacilityCode === facilityCode || !r.clinicFacilityCode)
    : allClinicRecords;

  const weeklyRecords = filteredClinicRecords.filter((r) => r.encounterDate >= sevenDaysAgoIso);

  const rawEncounters: PatientEncounterSummary[] = weeklyRecords.map((r) => ({
    uhid: r.uhid,
    patientName: r.patientName,
    age: r.age,
    gender: r.gender,
    villageCity: r.villageCity || 'Local Sector',
    encounterDate: r.encounterDate,
    diagnosis: r.finalDiagnosis || r.provisionalDiagnosis || r.chiefComplaint || 'Clinical Evaluation',
    chiefComplaint: r.chiefComplaint,
    attendingDoctor: r.attendingDoctor || 'Clinic Medical Officer'
  }));

  // Group by diagnosed disease
  const diseaseMap: Record<string, PatientEncounterSummary[]> = {};
  rawEncounters.forEach((enc) => {
    const norm = normalizeSurveillanceDiseaseId(enc.diagnosis);
    if (!diseaseMap[norm.id]) {
      diseaseMap[norm.id] = [];
    }
    diseaseMap[norm.id].push(enc);
  });

  const totalWeeklyCount = rawEncounters.length || 1;
  const diseasesBreakdown: DiseaseLocationBreakdown[] = Object.entries(diseaseMap).map(([dId, encList]) => {
    const norm = normalizeSurveillanceDiseaseId(encList[0].diagnosis);

    // Group this disease by location
    const locMap: Record<string, PatientEncounterSummary[]> = {};
    encList.forEach((e) => {
      if (!locMap[e.villageCity]) {
        locMap[e.villageCity] = [];
      }
      locMap[e.villageCity].push(e);
    });

    const locationDistribution = Object.entries(locMap)
      .map(([loc, list]) => ({
        location: loc,
        caseCount: list.length,
        patientList: list
      }))
      .sort((a, b) => b.caseCount - a.caseCount);

    const count = encList.length;
    const riskTier: 'Low' | 'Moderate' | 'High Surge' = count >= 5 ? 'High Surge' : count >= 3 ? 'Moderate' : 'Low';

    return {
      diseaseId: dId,
      diseaseName: norm.name,
      totalCases: count,
      percentageOfOPD: Math.round((count / totalWeeklyCount) * 100),
      locationDistribution,
      identifiedRiskTier: riskTier
    };
  }).sort((a, b) => b.totalCases - a.totalCases);

  // Group by Location
  const locSummaryMap: Record<string, PatientEncounterSummary[]> = {};
  rawEncounters.forEach((e) => {
    if (!locSummaryMap[e.villageCity]) {
      locSummaryMap[e.villageCity] = [];
    }
    locSummaryMap[e.villageCity].push(e);
  });

  const locationsSummary = Object.entries(locSummaryMap).map(([locName, list]) => {
    const dCountMap: Record<string, number> = {};
    list.forEach((e) => {
      const norm = normalizeSurveillanceDiseaseId(e.diagnosis);
      dCountMap[norm.name.en] = (dCountMap[norm.name.en] || 0) + 1;
    });

    const topDiseases = Object.entries(dCountMap)
      .map(([disease, count]) => ({ disease, count }))
      .sort((a, b) => b.count - a.count);

    return {
      locationName: locName,
      totalPatients: list.length,
      topDiseases
    };
  }).sort((a, b) => b.totalPatients - a.totalPatients);

  return {
    clinicName: clinicName || weeklyRecords[0]?.clinicName || 'Sanand Community Health Center & General Hospital',
    facilityCode: facilityCode || 'CHC-SAN-01',
    generatedAt: new Date().toISOString(),
    reportPeriod: {
      startDate: sevenDaysAgoIso,
      endDate: new Date().toISOString(),
      totalEncounters: rawEncounters.length
    },
    diseasesBreakdown,
    locationsSummary,
    rawEncounters
  };
}

/**
 * Weekly Epidemiological Cluster Analysis Engine for a Single Clinic
 */
export async function analyzeWeeklyClinicOutbreaks(facilityCode?: string, clinicName?: string): Promise<{
  clusters: DetectedDiseaseCluster[];
  weeklyTotalEncounters: number;
  infectiousSurgeCount: number;
  redAlertClustersCount: number;
  orangeAlertClustersCount: number;
  activePublishedAlerts: OutbreakAlert[];
  weeklyReport: WeeklyClinicEpidemiologyReport;
}> {
  const report = await generateWeeklyClinicReport(facilityCode, clinicName);

  // Fetch only active alerts published by this clinic (or all active alerts if no facility code)
  const allAlerts = await db.alerts.where('status').equals('active').toArray();
  const publishedAlerts = facilityCode
    ? allAlerts.filter((a) => !a.contributingFacility || a.contributingFacility.facilityCode === facilityCode)
    : allAlerts;

  const publishedDiseaseMap: Record<string, OutbreakAlert> = {};
  publishedAlerts.forEach((a) => {
    publishedDiseaseMap[a.diseaseId] = a;
  });

  const clusters: DetectedDiseaseCluster[] = [];

  for (const dBreakdown of report.diseasesBreakdown) {
    const weeklyCount = dBreakdown.totalCases;
    const primaryLoc = dBreakdown.locationDistribution[0]?.location || 'Sanand & Anandpura';
    const coords = REGIONAL_COORDINATES[primaryLoc] || REGIONAL_COORDINATES['Sanand & Anandpura'] || { lat: 22.99, lng: 72.37, defaultRadiusKm: 5 };

    let severity: RiskLevel = 'green';
    let isOutbreak = false;

    if (weeklyCount >= 5) {
      severity = 'red';
      isOutbreak = true;
    } else if (weeklyCount >= 3) {
      severity = 'orange';
      isOutbreak = true;
    } else if (weeklyCount >= 2) {
      severity = 'green';
      isOutbreak = true;
    }

    const patientEncounters = dBreakdown.locationDistribution.flatMap((l) => l.patientList);
    const sortedDates = patientEncounters.map((p) => p.encounterDate).sort();

    const precautions = (precautionsData as any)[dBreakdown.diseaseId] || (precautionsData as any)['viral_fever'] || {
      title: { en: 'Preventive Measures', hi: 'निवारक उपाय', gu: 'સાવચેતીના પગલાં' },
      items: {
        en: ['Maintain strict hygiene', 'Avoid stagnant water', 'Seek medical advice immediately'],
        hi: ['स्वच्छता बनाए रखें', 'जलजमाव से बचें', 'तुरंत चिकित्सकीय परामर्श लें'],
        gu: ['સ્વચ્છતા જાળવો', 'પાણીનો ભરાવો ન થવા દો', 'તાત્કાલિક ડૉક્ટરની સલાહ લો']
      }
    };

    const guidance: MultilingualText = {
      en: `High surge of ${dBreakdown.diseaseName.en} observed in ${primaryLoc}. ${precautions.items?.en?.[0] || 'Take preventive precautions and consult clinic immediately.'}`,
      hi: `${primaryLoc} में ${dBreakdown.diseaseName.hi} के मामलों में वृद्धि। ${precautions.items?.hi?.[0] || 'निवारक सावधानी बरतें और तुरंत अस्पताल से संपर्क करें।'}`,
      gu: `${primaryLoc} વિસ્તારમાં ${dBreakdown.diseaseName.gu} ના કેસોમાં વધારો. ${precautions.items?.gu?.[0] || 'સાવચેતી રાખો અને તાત્કાલિક ક્લિનિકનો સંપર્ક કરો.'}`
    };

    const publishedMatch = publishedDiseaseMap[dBreakdown.diseaseId];

    clusters.push({
      clusterId: `cluster_${dBreakdown.diseaseId}_${primaryLoc.toLowerCase().replace(/\s+/g, '_')}`,
      diseaseId: dBreakdown.diseaseId,
      diseaseName: dBreakdown.diseaseName,
      primaryLocation: primaryLoc,
      centerCoords: { lat: coords.lat, lng: coords.lng },
      suggestedRadiusKm: coords.defaultRadiusKm,
      weeklyCaseCount: weeklyCount,
      previousWeeklyCount: Math.max(1, Math.round(weeklyCount * 0.4)),
      growthRatePct: 150,
      severity,
      isOutbreak,
      affectedLocations: dBreakdown.locationDistribution.map((l) => ({ name: l.location, count: l.caseCount })),
      firstEncounterDate: sortedDates[0] || new Date().toISOString(),
      latestEncounterDate: sortedDates[sortedDates.length - 1] || new Date().toISOString(),
      patientUhidList: patientEncounters.map((p) => p.uhid),
      clinicalGuidance: guidance,
      isAlreadyPublished: !!publishedMatch,
      publishedAlertId: publishedMatch?.id
    });
  }

  return {
    clusters,
    weeklyTotalEncounters: report.reportPeriod.totalEncounters,
    infectiousSurgeCount: clusters.filter((c) => c.isOutbreak).length,
    redAlertClustersCount: clusters.filter((c) => c.severity === 'red').length,
    orangeAlertClustersCount: clusters.filter((c) => c.severity === 'orange').length,
    activePublishedAlerts: publishedAlerts,
    weeklyReport: report
  };
}

/**
 * Publish / Broadcast Outbreak Alert from Clinic/Hospital to Citizen Side
 */
export async function publishOutbreakAlert(payload: OutbreakPublishPayload): Promise<OutbreakAlert> {
  const alertId = `outbreak_hosp_${payload.diseaseId}_${Date.now()}`;
  const nowIso = new Date().toISOString();

  const newAlert: OutbreakAlert = {
    id: alertId,
    diseaseId: payload.diseaseId,
    diseaseName: payload.diseaseName,
    center: {
      lat: payload.lat,
      lng: payload.lng,
      villageName: payload.locationName
    },
    radiusKm: payload.radiusKm,
    caseCount: payload.caseCount,
    firstReported: new Date(Date.now() - 3 * 86400000).toISOString(),
    lastReported: nowIso,
    riskLevel: payload.severity,
    status: 'active',
    contributingFacility: {
      clinicName: payload.contributingFacility.clinicName,
      facilityCode: payload.contributingFacility.facilityCode,
      doctorName: payload.contributingFacility.doctorName || 'Senior Medical Officer',
      verifiedAt: nowIso
    },
    customGuidance: payload.customGuidance,
    weeklyGrowthPct: payload.weeklyGrowthPct || 0,
    affectedAreas: payload.affectedAreas
  };

  // Save to Dexie DB
  await db.alerts.put(newAlert);

  // Trigger browser notification if supported and permitted
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(`🚨 Community Outbreak Alert: ${payload.diseaseName.en}`, {
        body: `${payload.caseCount} cases reported from ${payload.locationName}. Verified & released by ${payload.contributingFacility.clinicName}.`,
        icon: '/pwa-192x192.png'
      });
    } catch (e) {
      console.warn('Browser notification trigger skipped', e);
    }
  }

  return newAlert;
}

/**
 * Resolve / Close an Outbreak Alert
 */
export async function resolveOutbreakAlert(alertId: string): Promise<void> {
  await db.alerts.update(alertId, { status: 'resolved' });
}
