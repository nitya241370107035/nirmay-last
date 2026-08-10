import { db } from '../db/db';
import { Family, Patient, CaseRecord } from '../types';

/**
 * Ensures all existing patients in the database belong to a family.
 * If any patient lacks a familyId, a new household record is generated.
 */
export async function ensureFamilyMigration(): Promise<number> {
  try {
    const allPatients = await db.patients.toArray();
    let migratedCount = 0;

    for (const p of allPatients) {
      if (!p.familyId && p.id) {
        const isAnon = p.name.toLowerCase().includes('walk-in') || p.name.toLowerCase().includes('anonymous');
        const familyName = isAnon ? 'Walk-in Household' : `${p.name}'s Household`;
        
        const familyId = await db.families.add({
          name: familyName,
          headName: p.name,
          village: p.village || 'Local Village',
          createdAt: p.createdAt || new Date().toISOString(),
          passcode: '1234' // Default family privacy PIN
        });

        await db.patients.update(p.id, {
          familyId,
          relationToHead: p.relationToHead || 'Head of Household'
        });
        migratedCount++;
      }
    }
    return migratedCount;
  } catch (err) {
    console.error('Error in family migration check:', err);
    return 0;
  }
}

/**
 * Get all families enriched with member list and total member count
 */
export async function getAllFamiliesWithMembers(): Promise<{ family: Family; members: Patient[] }[]> {
  await ensureFamilyMigration();
  const families = await db.families.orderBy('createdAt').reverse().toArray();
  const result: { family: Family; members: Patient[] }[] = [];

  for (const fam of families) {
    if (fam.id) {
      const members = await db.patients.where('familyId').equals(fam.id).toArray();
      result.push({ family: fam, members });
    }
  }

  return result;
}

/**
 * Get a specific family and its members
 */
export async function getFamilyWithMembers(familyId: number): Promise<{ family: Family; members: Patient[] } | null> {
  const family = await db.families.get(familyId);
  if (!family) return null;

  const members = await db.patients.where('familyId').equals(familyId).toArray();
  return { family, members };
}

/**
 * Register a new household/family with initial members
 */
export async function createFamilyWithMembers(
  familyData: Omit<Family, 'id' | 'createdAt'>,
  membersData: {
    name: string;
    age: number;
    gender: string;
    relationToHead: string;
    village?: string;
    allergies?: string[];
    isPregnant?: boolean;
    childBirthDate?: string;
  }[]
): Promise<{ familyId: number; firstMemberId: number }> {
  const createdAt = new Date().toISOString();
  const headName = membersData.find(m => m.relationToHead === 'Head of Household' || m.relationToHead === 'Head')?.name || membersData[0]?.name || familyData.name;

  const familyId = await db.families.add({
    ...familyData,
    headName,
    createdAt
  });

  let firstMemberId = 0;

  for (let i = 0; i < membersData.length; i++) {
    const m = membersData[i];
    const newPatient: Patient = {
      familyId,
      name: m.name.trim(),
      age: m.age,
      gender: m.gender,
      relationToHead: m.relationToHead,
      village: familyData.village || m.village || 'Local Village',
      createdAt,
      allergies: m.allergies || [],
      isPregnant: m.isPregnant || false,
      childBirthDate: m.childBirthDate
    };

    const patientId = await db.patients.add(newPatient);
    if (i === 0) firstMemberId = patientId;
  }

  return { familyId, firstMemberId };
}

/**
 * Add a new member to an existing family
 */
export async function addMemberToFamily(
  familyId: number,
  member: Omit<Patient, 'id' | 'familyId' | 'createdAt'>
): Promise<Patient> {
  const family = await db.families.get(familyId);
  const createdAt = new Date().toISOString();

  const newPatient: Patient = {
    ...member,
    familyId,
    village: family?.village || member.village || 'Local Village',
    createdAt
  };

  const id = await db.patients.add(newPatient);
  newPatient.id = id;
  return newPatient;
}

/**
 * Update family household details
 */
export async function updateFamilyDetails(
  familyId: number,
  data: Partial<Family>
): Promise<void> {
  await db.families.update(familyId, data);
}

/**
 * Get recent families for quick access
 */
export async function getRecentFamilies(limit = 4): Promise<{ family: Family; members: Patient[] }[]> {
  await ensureFamilyMigration();
  const families = await db.families.orderBy('createdAt').reverse().limit(limit).toArray();
  const result: { family: Family; members: Patient[] }[] = [];

  for (const fam of families) {
    if (fam.id) {
      const members = await db.patients.where('familyId').equals(fam.id).toArray();
      result.push({ family: fam, members });
    }
  }

  return result;
}

/**
 * Smart Recall across the same family for similar past diagnoses
 */
export async function getFamilyPreviousCasesForDisease(
  patientId: number,
  diagnosisId: string
): Promise<{ caseRecord: CaseRecord; patientName: string; relationToHead?: string; isSamePatient: boolean }[]> {
  const patient = await db.patients.get(patientId);
  if (!patient || !patient.familyId) {
    // Fallback to individual
    const indivCases = await db.cases.where({ patientId, diagnosisId }).reverse().sortBy('date');
    return indivCases.map(c => ({
      caseRecord: c,
      patientName: patient?.name || 'Patient',
      relationToHead: patient?.relationToHead,
      isSamePatient: true
    }));
  }

  const familyMembers = await db.patients.where('familyId').equals(patient.familyId).toArray();
  const memberMap = new Map<number, Patient>();
  familyMembers.forEach(m => {
    if (m.id) memberMap.set(m.id, m);
  });

  const allFamilyCases: { caseRecord: CaseRecord; patientName: string; relationToHead?: string; isSamePatient: boolean }[] = [];

  for (const m of familyMembers) {
    if (m.id) {
      const cases = await db.cases.where({ patientId: m.id, diagnosisId }).toArray();
      cases.forEach(c => {
        allFamilyCases.push({
          caseRecord: c,
          patientName: m.name,
          relationToHead: m.relationToHead,
          isSamePatient: m.id === patientId
        });
      });
    }
  }

  allFamilyCases.sort((a, b) => (b.caseRecord.date > a.caseRecord.date ? 1 : -1));
  return allFamilyCases;
}

/**
 * Verify household PIN/passcode or Head of Household name for family privacy access
 */
export async function verifyFamilyPasscode(familyId: number, pinOrName: string): Promise<boolean> {
  const family = await db.families.get(familyId);
  if (!family) return false;

  const query = pinOrName.trim().toLowerCase();
  if (!query) return false;

  // Match 4-digit PIN (default '1234')
  if (family.passcode) {
    if (family.passcode === query) return true;
  } else if (query === '1234') {
    return true;
  }

  // Match Head Name
  if (family.headName && family.headName.toLowerCase().includes(query)) {
    return true;
  }

  // Match member name in family
  const members = await db.patients.where('familyId').equals(familyId).toArray();
  const matchMember = members.some((m) => m.name.toLowerCase().includes(query));
  if (matchMember) return true;

  return false;
}

