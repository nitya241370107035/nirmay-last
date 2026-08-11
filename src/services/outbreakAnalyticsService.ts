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
 * Ensures doctors & hospitals immediately see live epidemiological surveillance charts
 */
export async function seedSurveillanceEncounterDataIfEmpty(): Promise<void> {
  const existingCount = await db.clinicRecords.count();
  if (existingCount >= 8) return;

  const now = Date.now();
  const ONE_DAY = 86400000;

  const sampleSurveillanceEncounters: Partial<ClinicRecord>[] = [
    // 5 Dengue Cases in Sanand & Anandpura (Triggering RED Alert)
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

    // 4 Acute Gastroenteritis cases in West Ahmedabad & Bavla (Orange Alert)
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
 * Weekly Epidemiological Cluster Analysis Engine
 * Scans all clinic encounters and citizen records within past 7 days, groups by disease and location,
 * and classifies outbreak risk level.
 */
export async function analyzeWeeklyClinicOutbreaks(facilityCode?: string): Promise<{
  clusters: DetectedDiseaseCluster[];
  weeklyTotalEncounters: number;
  infectiousSurgeCount: number;
  redAlertClustersCount: number;
  orangeAlertClustersCount: number;
  activePublishedAlerts: OutbreakAlert[];
}> {
  await seedSurveillanceEncounterDataIfEmpty();

  const now = Date.now();
  const SEVEN_DAYS_MS = 7 * 86400000;
  const FOURTEEN_DAYS_MS = 14 * 86400000;
  const sevenDaysAgoIso = new Date(now - SEVEN_DAYS_MS).toISOString();
  const fourteenDaysAgoIso = new Date(now - FOURTEEN_DAYS_MS).toISOString();

  // 1. Fetch clinic records
  const allClinicRecords = await db.clinicRecords.toArray();
  const allCases = await db.cases.toArray();
  const allPatients = await db.patients.toArray();
  const patientVillageMap: Record<number, string> = {};
  allPatients.forEach((p) => {
    if (p.id) patientVillageMap[p.id] = p.village || 'Sanand & Anandpura';
  });

  // Filter records in current 7-day window vs previous 7-day window
  const currentWeekClinic = allClinicRecords.filter((r) => r.encounterDate >= sevenDaysAgoIso);
  const prevWeekClinic = allClinicRecords.filter((r) => r.encounterDate >= fourteenDaysAgoIso && r.encounterDate < sevenDaysAgoIso);

  const currentWeekCases = allCases.filter((c) => c.date >= sevenDaysAgoIso);
  const prevWeekCases = allCases.filter((c) => c.date >= fourteenDaysAgoIso && c.date < sevenDaysAgoIso);

  // Group Encounters by Canonical Disease ID + Primary Location
  interface EncounterItem {
    diseaseId: string;
    diseaseName: MultilingualText;
    location: string;
    date: string;
    uhid: string;
  }

  const currentEncounters: EncounterItem[] = [];
  const prevEncounters: EncounterItem[] = [];

  currentWeekClinic.forEach((r) => {
    const rawDisease = r.finalDiagnosis || r.provisionalDiagnosis || r.triageResult?.disposition?.urgency || r.chiefComplaint;
    if (!rawDisease) return;
    const normalized = normalizeSurveillanceDiseaseId(rawDisease);
    const loc = r.villageCity || 'Sanand & Anandpura';
    currentEncounters.push({
      diseaseId: normalized.id,
      diseaseName: normalized.name,
      location: loc,
      date: r.encounterDate,
      uhid: r.uhid
    });
  });

  currentWeekCases.forEach((c) => {
    const normalized = normalizeSurveillanceDiseaseId(c.diagnosisName || c.diagnosisId);
    const loc = (c.patientId && patientVillageMap[c.patientId]) || 'Sanand & Anandpura';
    currentEncounters.push({
      diseaseId: normalized.id,
      diseaseName: normalized.name,
      location: loc,
      date: c.date,
      uhid: `CAS-${c.id || Math.floor(Math.random() * 90000)}`
    });
  });

  prevWeekClinic.forEach((r) => {
    const raw = r.finalDiagnosis || r.provisionalDiagnosis || r.chiefComplaint;
    if (!raw) return;
    const normalized = normalizeSurveillanceDiseaseId(raw);
    prevEncounters.push({
      diseaseId: normalized.id,
      diseaseName: normalized.name,
      location: r.villageCity || 'Sanand & Anandpura',
      date: r.encounterDate,
      uhid: r.uhid
    });
  });

  prevWeekCases.forEach((c) => {
    const normalized = normalizeSurveillanceDiseaseId(c.diagnosisName || c.diagnosisId);
    prevEncounters.push({
      diseaseId: normalized.id,
      diseaseName: normalized.name,
      location: (c.patientId && patientVillageMap[c.patientId]) || 'Sanand & Anandpura',
      date: c.date,
      uhid: `CAS-${c.id || 0}`
    });
  });

  // Group current encounters by diseaseId
  const diseaseGroups: Record<string, EncounterItem[]> = {};
  currentEncounters.forEach((item) => {
    if (!diseaseGroups[item.diseaseId]) {
      diseaseGroups[item.diseaseId] = [];
    }
    diseaseGroups[item.diseaseId].push(item);
  });

  // Get active published alerts in DB to check publish status
  const publishedAlerts = await db.alerts.where('status').equals('active').toArray();
  const publishedDiseaseMap: Record<string, OutbreakAlert> = {};
  publishedAlerts.forEach((a) => {
    publishedDiseaseMap[a.diseaseId] = a;
  });

  const clusters: DetectedDiseaseCluster[] = [];

  for (const [diseaseId, items] of Object.entries(diseaseGroups)) {
    const weeklyCount = items.length;
    const prevCount = prevEncounters.filter((p) => p.diseaseId === diseaseId).length;
    const growthRatePct = prevCount > 0 ? Math.round(((weeklyCount - prevCount) / prevCount) * 100) : weeklyCount * 50;

    // Location breakdown
    const locMap: Record<string, number> = {};
    items.forEach((it) => {
      locMap[it.location] = (locMap[it.location] || 0) + 1;
    });

    const sortedLocs = Object.entries(locMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    const primaryLocation = sortedLocs[0]?.name || 'Sanand & Anandpura';
    const coords = REGIONAL_COORDINATES[primaryLocation] || REGIONAL_COORDINATES['Sanand & Anandpura'] || { lat: 22.99, lng: 72.37, defaultRadiusKm: 5 };

    // Severity Thresholds:
    // Red (High Alert Outbreak): >= 5 cases in 7 days
    // Orange (Moderate Cluster Alert): 3-4 cases in 7 days
    // Green (Low / Early Watchlist): 1-2 cases
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

    const sortedDates = items.map((i) => i.date).sort();
    const diseaseName = items[0].diseaseName;

    // Localized Clinical Preventive Guidance
    const precautions = (precautionsData as any)[diseaseId] || (precautionsData as any)['viral_fever'] || {
      title: { en: 'Preventive Measures', hi: 'निवारक उपाय', gu: 'સાવચેતીના પગલાં' },
      items: {
        en: ['Maintain strict hygiene', 'Avoid stagnant water', 'Seek medical advice immediately'],
        hi: ['स्वच्छता बनाए रखें', 'जलजमाव से बचें', 'तुरंत चिकित्सकीय परामर्श लें'],
        gu: ['સ્વચ્છતા જાળવો', 'પાણીનો ભરાવો ન થવા દો', 'તાત્કાલિક ડૉક્ટરની સલાહ લો']
      }
    };

    const guidance: MultilingualText = {
      en: `High surge of ${diseaseName.en} detected in ${primaryLocation}. ${precautions.items?.en?.[0] || 'Take preventive precautions and consult clinic immediately.'}`,
      hi: `${primaryLocation} में ${diseaseName.hi} के मामलों में तीव्र वृद्धि। ${precautions.items?.hi?.[0] || 'निवारक सावधानी बरतें और तुरंत अस्पताल से संपर्क करें।'}`,
      gu: `${primaryLocation} વિસ્તારમાં ${diseaseName.gu} ના કેસોમાં નોંધપાત્ર વધારો. ${precautions.items?.gu?.[0] || 'સાવચેતી રાખો અને તાત્કાલિક ક્લિનિકનો સંપર્ક કરો.'}`
    };

    const publishedMatch = publishedDiseaseMap[diseaseId];

    clusters.push({
      clusterId: `cluster_${diseaseId}_${primaryLocation.toLowerCase().replace(/\s+/g, '_')}`,
      diseaseId,
      diseaseName,
      primaryLocation,
      centerCoords: { lat: coords.lat, lng: coords.lng },
      suggestedRadiusKm: coords.defaultRadiusKm,
      weeklyCaseCount: weeklyCount,
      previousWeeklyCount: prevCount,
      growthRatePct,
      severity,
      isOutbreak,
      affectedLocations: sortedLocs,
      firstEncounterDate: sortedDates[0],
      latestEncounterDate: sortedDates[sortedDates.length - 1],
      patientUhidList: items.map((i) => i.uhid),
      clinicalGuidance: guidance,
      isAlreadyPublished: !!publishedMatch,
      publishedAlertId: publishedMatch?.id
    });
  }

  // Sort clusters: Red first, then Orange, then by case count
  clusters.sort((a, b) => {
    const score = (sev: RiskLevel) => (sev === 'red' ? 3 : sev === 'orange' ? 2 : 1);
    return score(b.severity) - score(a.severity) || b.weeklyCaseCount - a.weeklyCaseCount;
  });

  return {
    clusters,
    weeklyTotalEncounters: currentEncounters.length,
    infectiousSurgeCount: clusters.filter((c) => c.isOutbreak).length,
    redAlertClustersCount: clusters.filter((c) => c.severity === 'red').length,
    orangeAlertClustersCount: clusters.filter((c) => c.severity === 'orange').length,
    activePublishedAlerts: publishedAlerts
  };
}

/**
 * Publish / Broadcast Outbreak Alert from Clinic/Hospital to Citizen Side
 * Inserts into Dexie `db.alerts` with hospital attribution and triggers push notification.
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
      doctorName: payload.contributingFacility.doctorName || 'Senior Medical Epidemiologist',
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
        body: `${payload.caseCount} weekly cases reported in ${payload.locationName}. Verified by ${payload.contributingFacility.clinicName}.`,
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
