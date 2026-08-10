import { db } from '../db/db';
import { SyncQueueItem, OutbreakAlert, RiskLevel, LanguageCode, MultilingualText, MultilingualList } from '../types';
import precautionsData from '../data/precautions.json';

const COMMUNITY_SHARING_KEY = 'niramay_community_sharing_enabled';

// Get current sharing preference (default true)
export function getSharingPreference(): boolean {
  const val = localStorage.getItem(COMMUNITY_SHARING_KEY);
  return val !== null ? val === 'true' : true;
}

// Set sharing preference
export function setSharingPreference(enabled: boolean): void {
  localStorage.setItem(COMMUNITY_SHARING_KEY, String(enabled));
}

// Default regional clinic coordinates (Anand / Sanand / Ahmedabad region)
const DEFAULT_CLINIC_LOCATION = {
  lat: 22.99,
  lng: 72.37,
  village: 'Anandpura Health Center'
};

// Queue an anonymized case report for community outbreak surveillance
export async function queueCaseForSync(
  diseaseId: string,
  diseaseName: string,
  risk: RiskLevel,
  village?: string,
  customCoords?: { lat: number; lng: number }
): Promise<void> {
  if (!getSharingPreference()) {
    console.log('Community case sharing disabled by user preference.');
    return;
  }

  const location = {
    lat: customCoords?.lat || DEFAULT_CLINIC_LOCATION.lat + (Math.random() - 0.5) * 0.02,
    lng: customCoords?.lng || DEFAULT_CLINIC_LOCATION.lng + (Math.random() - 0.5) * 0.02,
    village: village || DEFAULT_CLINIC_LOCATION.village
  };

  const item: SyncQueueItem = {
    diseaseId,
    diseaseName,
    location,
    timestamp: new Date().toISOString(),
    risk,
    synced: false
  };

  await db.syncQueue.add(item);
  await runOutbreakDetectionAndSync();
}

// Seed initial baseline community outbreaks so health workers see realistic local data immediately
async function seedInitialOutbreakAlertsIfEmpty() {
  const count = await db.alerts.count();
  if (count === 0) {
    const initialAlerts: OutbreakAlert[] = [
      {
        id: 'outbreak_dengue_sanand',
        diseaseId: 'dengue',
        diseaseName: {
          en: 'Dengue Mosquito Fever Outbreak',
          hi: 'डेगू बुखार प्रकोप',
          gu: 'ડેન્ગ્યુ મચ્છરજન્ય તાવનો ઉપદ્રવ'
        },
        center: { lat: 22.99, lng: 72.37, villageName: 'Sanand & Anandpura Sector' },
        radiusKm: 5,
        caseCount: 4,
        firstReported: new Date(Date.now() - 4 * 86400000).toISOString(),
        lastReported: new Date().toISOString(),
        riskLevel: 'red',
        status: 'active'
      },
      {
        id: 'outbreak_viral_ahmedabad',
        diseaseId: 'viral_fever',
        diseaseName: {
          en: 'Seasonal Viral Fever Cluster',
          hi: 'मौसमी वायरल बुखार क्लस्टर',
          gu: 'મોસમી વાયરલ તાવ ક્લસ્ટર'
        },
        center: { lat: 23.02, lng: 72.57, villageName: 'West Ahmedabad Rural' },
        radiusKm: 8,
        caseCount: 7,
        firstReported: new Date(Date.now() - 6 * 86400000).toISOString(),
        lastReported: new Date().toISOString(),
        riskLevel: 'orange',
        status: 'active'
      },
      {
        id: 'outbreak_food_poisoning_rajkot',
        diseaseId: 'food_poisoning',
        diseaseName: {
          en: 'Acute Gastroenteritis / Food Poisoning Cluster',
          hi: 'तीव्र पेट संक्रमण / खाद्य विषाक्तता',
          gu: 'ઝાડા-ઉલટી અને ફૂડ પોઈઝનિંગ ઘટના'
        },
        center: { lat: 22.30, lng: 70.80, villageName: 'Rajkot North District' },
        radiusKm: 6,
        caseCount: 3,
        firstReported: new Date(Date.now() - 2 * 86400000).toISOString(),
        lastReported: new Date().toISOString(),
        riskLevel: 'orange',
        status: 'active'
      }
    ];

    for (const alert of initialAlerts) {
      await db.alerts.put(alert);
    }
  }
}

// Run outbreak detection engine across all local queued reports + active database
export async function runOutbreakDetectionAndSync(): Promise<{
  newAlertsCount: number;
  totalActiveAlerts: number;
}> {
  await seedInitialOutbreakAlertsIfEmpty();

  // Mark all unsynced items as synced (simulated upload)
  const unsynced = await db.syncQueue.where('synced').equals(0).toArray();
  for (const item of unsynced) {
    if (item.id) {
      await db.syncQueue.update(item.id, { synced: true });
    }
  }

  // Cluster analysis across all reports in sync queue
  const allReports = await db.syncQueue.toArray();
  const diseaseGroups: Record<string, SyncQueueItem[]> = {};

  for (const rep of allReports) {
    if (!diseaseGroups[rep.diseaseId]) {
      diseaseGroups[rep.diseaseId] = [];
    }
    diseaseGroups[rep.diseaseId].push(rep);
  }

  let newAlertsCreated = 0;

  for (const [diseaseId, reports] of Object.entries(diseaseGroups)) {
    // If >= 2 cases of same disease recorded
    if (reports.length >= 2) {
      const alertId = `outbreak_auto_${diseaseId}`;
      const existing = await db.alerts.get(alertId);

      const latestReport = reports[reports.length - 1];
      const highestRisk: RiskLevel = reports.some((r) => r.risk === 'red') ? 'red' : 'orange';

      const diseaseNameMap: MultilingualText = {
        en: `${latestReport.diseaseName} Outbreak Cluster`,
        hi: `${latestReport.diseaseName} प्रकोप क्षेत्र`,
        gu: `${latestReport.diseaseName} ઉપદ્રવ ક્લસ્ટર`
      };

      const updatedAlert: OutbreakAlert = {
        id: alertId,
        diseaseId,
        diseaseName: diseaseNameMap,
        center: {
          lat: latestReport.location.lat,
          lng: latestReport.location.lng,
          villageName: latestReport.location.village || 'Local Village Sector'
        },
        radiusKm: 5,
        caseCount: reports.length + (existing ? existing.caseCount : 2),
        firstReported: existing ? existing.firstReported : reports[0].timestamp,
        lastReported: new Date().toISOString(),
        riskLevel: highestRisk,
        status: 'active'
      };

      if (!existing) {
        newAlertsCreated++;
        // Trigger push/local browser notification
        triggerOutbreakNotification(updatedAlert);
      }

      await db.alerts.put(updatedAlert);
    }
  }

  const activeAlerts = await db.alerts.where('status').equals('active').toArray();

  return {
    newAlertsCount: newAlertsCreated,
    totalActiveAlerts: activeAlerts.length
  };
}

// Calculate haversine distance between two coordinates in km
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

// Get precautions for a disease ID
export function getPrecautionsForDisease(
  diseaseId: string,
  lang: LanguageCode = 'en'
): { title: string; items: string[] } {
  const data = (precautionsData as any)[diseaseId];
  if (data && data.title && data.items) {
    return {
      title: data.title[lang] || data.title.en,
      items: data.items[lang] || data.items.en
    };
  }

  // Fallback general epidemic precautions
  const fallbackTitles: Record<LanguageCode, string> = {
    en: 'General Infection Control & Sanitation',
    hi: 'सामान्य संक्रमण नियंत्रण एवं स्वच्छता दिशा-निर्देश',
    gu: 'સામાન્ય ચેપ અટકાવ અને સ્વચ્છતા માર્ગદર્શિકા'
  };

  const fallbackItems: Record<LanguageCode, string[]> = {
    en: [
      'Maintain clean drinking water supply and boil water if questionable.',
      'Wash hands thoroughly with soap before meals and after patient contact.',
      'Maintain personal hygiene and wear protective gear when caring for sick persons.',
      'Report new clusters of similar symptoms immediately to primary health centers.'
    ],
    hi: [
      'पीने के पानी को स्वच्छ रखें और संदेह होने पर उबालकर पिएं।',
      'भोजन से पहले और मरीजों के संपर्क के बाद हाथों को साबुन से धोएं।',
      'रोगी की देखभाल करते समय स्वच्छता और सुरक्षा मानकों का पालन करें।',
      'समान लक्षणों के नए मामलों की सूचना तुरंत प्राथमिक स्वास्थ्य केंद्र को दें।'
    ],
    gu: [
      'પીવાનું પાણી શુદ્ધ રાખો અને શંકા હોય તો ઉકાળીને પીવો.',
      'જમતા પહેલાં અને દર્દીઓની સંભાળ લીધા પછી હાથ સાબુથી ધુઓ.',
      'બીમાર વ્યક્તિની સેવા કરતી વખતે મોં પર માસ્ક અને સ્વચ્છતા રાખો.',
      'એકસરખા લક્ષણો ધરાવતા દર્દીઓની તરત જ આરોગ્ય કેન્દ્રમાં જાણ કરો.'
    ]
  };

  return {
    title: fallbackTitles[lang] || fallbackTitles.en,
    items: fallbackItems[lang] || fallbackItems.en
  };
}

// Request Web Notification permission
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission !== 'denied') {
    const perm = await Notification.requestPermission();
    return perm === 'granted';
  }
  return false;
}

// Trigger Web Browser Push Notification
export function triggerOutbreakNotification(alert: OutbreakAlert): void {
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification('Nirāmay Outbreak Alert Detected', {
        body: `Cluster detected: ${alert.caseCount} cases reported near ${alert.center.villageName || 'your region'}. Tap for precautions.`,
        icon: '/favicon.ico'
      });
    } catch (e) {
      console.warn('Browser notification failed:', e);
    }
  }
}
