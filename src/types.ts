export type RiskLevel = 'red' | 'orange' | 'green';

export type LanguageCode = 'en' | 'hi' | 'gu';

export interface MultilingualText {
  en: string;
  hi: string;
  gu: string;
}

export interface QuestionOption {
  value: string;
  label: MultilingualText;
}

export interface QuestionStep {
  id: string;
  type: 'buttons' | 'text' | 'multiline' | 'checklist';
  question: MultilingualText;
  options?: QuestionOption[];
  placeholder?: MultilingualText;
}

export interface CaseData {
  age_group?: string;
  gender?: string;
  chief_complaint?: string;
  duration?: string;
  additional_symptoms?: string[];
  associated_signs?: string[];
  vitals?: string[];
  medical_history?: string[];
  exposure_history?: string[];
  severity?: string;
  [key: string]: any;
}

export interface DiseaseDefinition {
  id: string;
  name: MultilingualText;
  symptoms: { [symptomId: string]: number };
  exclusions: string[];
  min_duration_days: number;
  base_urgency: RiskLevel;
}

export interface MedicineItem {
  name: MultilingualText;
  benefit: MultilingualText;
  sideEffects: MultilingualText;
}

export interface MedicineItemV2 {
  id: string;
  name: MultilingualText;
  system: 'allopathy' | 'ayurveda' | 'homeopathy';
  benefit: MultilingualText;
  sideEffects: MultilingualText;
  howToTake: MultilingualText;
  contraindications: MultilingualText;
  ageRestriction?: 'infant' | 'child' | 'adult' | 'elderly' | null;
  pregnancySafe: boolean;
  lactationSafe: boolean;
  isOTC: boolean;
}

export interface DiseaseMedicines {
  allopathy: MedicineItem[];
  ayurveda: MedicineItem[];
  homeopathy: MedicineItem[];
}

export interface DiseaseMedicinesV2 {
  allopathy: MedicineItemV2[];
  ayurveda: MedicineItemV2[];
  homeopathy: MedicineItemV2[];
}

export interface MultilingualList {
  en: string[];
  hi: string[];
  gu: string[];
}

export interface DietSection {
  eat: MultilingualList;
  avoid: MultilingualList;
  reason: MultilingualText;
}

export interface DiseaseDietData {
  modern: DietSection;
  ayurveda?: DietSection;
  age_overrides?: {
    infant?: {
      modern?: { eat?: MultilingualList; avoid?: MultilingualList; reason?: MultilingualText };
      ayurveda?: { eat?: MultilingualList; avoid?: MultilingualList; reason?: MultilingualText };
    };
    child?: {
      modern?: { eat?: MultilingualList; avoid?: MultilingualList; reason?: MultilingualText };
      ayurveda?: { eat?: MultilingualList; avoid?: MultilingualList; reason?: MultilingualText };
    };
    elderly?: {
      modern?: { eat?: MultilingualList; avoid?: MultilingualList; reason?: MultilingualText };
      ayurveda?: { eat?: MultilingualList; avoid?: MultilingualList; reason?: MultilingualText };
    };
  };
}

export interface ResolvedDietSection {
  eat: string[];
  avoid: string[];
  reason: string;
}

export interface ResolvedDiet {
  modern: ResolvedDietSection;
  ayurveda?: ResolvedDietSection;
  isAgeOverridden: boolean;
  ageOverrideNote?: string;
}

export interface DifferentialDiagnosis {
  id: string;
  disease: DiseaseDefinition;
  name: string;
  score: number;
}

export interface DiagnosisResult {
  primaryDiseaseId: string;
  primaryDisease: DiseaseDefinition;
  primaryName: string;
  score: number;
  confidence: 'High' | 'Medium' | 'Low';
  differentialDiagnoses: DifferentialDiagnosis[];
}

export interface TriageAssessment {
  risk: RiskLevel;
  emergencyTrigger?: string;
  diagnosis: DiagnosisResult;
  extractedSymptoms: string[];
}

export type FacilityType = 'hospital' | 'clinic' | 'pharmacy';

export type CaseOutcome = 'improved' | 'worsened' | 'recovered' | 'no_change' | null;

export interface PatientCurrentMed {
  medId: string;
  name?: string;
  frequency?: string;
}

export interface ImmunizationRecord {
  vaccineId: string;
  dateGiven: string;
  notes?: string;
}

export interface AntenatalVisitRecord {
  date: string;
  gestationalAgeWeeks: number;
  gestationalAgeDays: number;
  trimester: string;
  dangerSignsChecked: string[];
  risk: RiskLevel;
  notes?: string;
}

export interface NutritionScreeningRecord {
  id?: string;
  date: string;
  checkedSignIds: string[];
  detectedDeficiencyIds: string[];
  summaryNames?: { en: string; hi: string; gu: string }[];
  dietAdviceAdded?: string[];
  notes?: string;
}

export interface Family {
  id?: number;
  name: string;
  headName?: string;
  address?: string;
  village: string;
  contactNumber?: string;
  createdAt: string;
  notes?: string;
  passcode?: string; // 4-digit Family Privacy Passcode
}

export interface Patient {
  id?: number;
  familyId?: number;
  relationToHead?: string;
  name: string;
  age: number;
  gender: string;
  village?: string;
  createdAt: string;
  allergies?: string[]; // Array of allergy IDs e.g. ["penicillin", "nsaid"]
  currentMeds?: PatientCurrentMed[]; // Array of current medications
  isPregnant?: boolean;
  lmpDate?: string; // YYYY-MM-DD
  edd?: string; // YYYY-MM-DD
  childBirthDate?: string; // YYYY-MM-DD
  immunizations?: ImmunizationRecord[];
  antenatalVisits?: AntenatalVisitRecord[];
  nutritionScreenings?: NutritionScreeningRecord[];
}

export interface SafetyConflict {
  medId: string;
  type: 'allergy' | 'interaction';
  severity: 'severe' | 'moderate' | 'mild';
  message: MultilingualText | string;
  allergyId?: string;
  allergyName?: MultilingualText | string;
  interactingMedId?: string;
  interactingMedName?: string;
  alternatives?: MedicineItemV2[];
}

export interface CaseRecord {
  id?: number;
  patientId: number;
  date: string;
  chiefComplaint?: string;
  duration?: string;
  symptoms: string[];
  vitals?: Record<string, any>;
  diagnosisId: string;
  diagnosisName: string;
  risk: RiskLevel;
  medicinesGiven: string[];
  dietGiven?: { eat: string[]; avoid: string[] };
  outcome?: CaseOutcome;
  outcomeNotes?: string;
  followUpDate?: string | null;
  followUpDone?: boolean;
  caseType?: 'routine' | 'antenatal' | 'postnatal' | 'immunization';
  mchNotes?: string;
}

export interface Facility {
  id: string;
  name: string;
  type: FacilityType;
  address: string;
  phone: string[];
  latitude: number;
  longitude: number;
  distanceKm?: number;
  empanelled_schemes?: string[];
}

export interface OutbreakAlert {
  id: string;
  diseaseId: string;
  diseaseName: MultilingualText;
  center: { lat: number; lng: number; villageName?: string };
  radiusKm: number;
  caseCount: number;
  firstReported: string;
  lastReported: string;
  riskLevel: RiskLevel;
  status: 'active' | 'resolved';
  distanceKm?: number;
}

export interface SyncQueueItem {
  id?: number;
  diseaseId: string;
  diseaseName: string;
  location: { lat: number; lng: number; village?: string };
  timestamp: string;
  risk: RiskLevel;
  synced: boolean;
}

export interface PrecautionDetail {
  title: MultilingualText;
  items: MultilingualList;
}

export type MedicationFrequency = 'once_daily' | 'twice_daily' | 'every_other_day' | 'weekly' | 'custom';

export interface MedicationSchedule {
  id?: number;
  patientId: number;
  medicineName: string;
  dosage: string;
  frequency: MedicationFrequency;
  customTimes?: string[];
  startDate: string; // YYYY-MM-DD
  endDate?: string | null; // YYYY-MM-DD or null
  notes?: string;
  active: boolean;
  createdAt: string;
}

export interface DoseLog {
  id?: number;
  scheduleId: number;
  scheduledDate: string; // YYYY-MM-DD
  scheduledTime: string; // HH:mm
  taken: boolean;
  takenAt?: string;
  skipped?: boolean;
  notes?: string;
}

export type WellnessGoalType = 'water_intake' | 'walking' | 'medication_generic' | 'custom';

export interface WellnessGoal {
  id?: number;
  patientId?: number;
  goalType: WellnessGoalType;
  title?: string;
  target: number;
  unit: string;
  frequency: 'daily' | 'weekly';
  active: boolean;
  createdAt: string;
}

export interface WellnessLog {
  id?: number;
  goalId: number;
  date: string; // YYYY-MM-DD
  value: number;
  loggedAt: string;
}

export interface GrowingGuide {
  climate: MultilingualText;
  soil: MultilingualText;
  watering: MultilingualText;
  harvesting: MultilingualText;
  pests: MultilingualText;
}

export interface MedicinalPlant {
  id: string;
  name: MultilingualText;
  scientificName?: string;
  description: MultilingualText;
  parts_used: string[];
  growing_guide: GrowingGuide;
  availability_season: string;
}

export interface RequiredPlantIngredient {
  plantId: string;
  quantity: number;
  unit: string;
}

export interface OtherIngredient {
  item: string;
  quantity: string;
  multilingual: MultilingualText;
}

export interface HomeRemedyRecipe {
  id: string;
  replaces_medicine_id: string;
  recipe_name: MultilingualText;
  description: MultilingualText;
  required_plants: RequiredPlantIngredient[];
  other_ingredients?: OtherIngredient[];
  preparation_steps: MultilingualText[];
  dosage: MultilingualText;
  shelf_life: MultilingualText;
  contraindications?: MultilingualText;
}

export interface GardenInventoryItem {
  id?: number;
  plantId: string;
  quantity: number; // e.g. number of plants, or -1 for plentiful
  notes?: string;
  lastUpdated: string;
}

export interface EnrichedHomeRemedyRecipe extends HomeRemedyRecipe {
  available: boolean;
  missingPlants: string[];
}

export interface ChronicLog {
  id?: number;
  patientId: number;
  date: string; // YYYY-MM-DD
  morningGlucose?: number; // mg/dL
  eveningGlucose?: number; // mg/dL
  medicationAdherence: boolean;
  exerciseMinutes: number;
  dietAdherence: number; // score 0 to 1
  waterIntake: number; // glasses
  symptoms?: string;
  notes?: string;
  loggedAt?: string;
}




