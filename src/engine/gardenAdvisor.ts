import { db } from '../db/db';
import {
  MedicinalPlant,
  HomeRemedyRecipe,
  GardenInventoryItem,
  EnrichedHomeRemedyRecipe,
  GrowingGuide
} from '../types';
import medicinalPlantsData from '../data/medicinal_plants.json';
import homeRemediesData from '../data/home_remedies.json';

const medicinalPlants = medicinalPlantsData as MedicinalPlant[];
const homeRemedies = homeRemediesData as HomeRemedyRecipe[];

/**
 * Get all medicinal plants from static catalogue
 */
export function getPlantCatalogue(): MedicinalPlant[] {
  return medicinalPlants;
}

/**
 * Get a specific plant by ID
 */
export function getPlantById(plantId: string): MedicinalPlant | undefined {
  return medicinalPlants.find((p) => p.id === plantId);
}

/**
 * Get growing guide for a specific plant
 */
export function getGrowingGuide(plantId: string): GrowingGuide | undefined {
  const plant = getPlantById(plantId);
  return plant?.growing_guide;
}

/**
 * Retrieve all garden inventory items joined with plant metadata
 */
export async function getAllGardenPlants(): Promise<
  Array<{ inventoryItem: GardenInventoryItem; plant: MedicinalPlant }>
> {
  const inventory = await db.gardenInventory.toArray();
  const result: Array<{ inventoryItem: GardenInventoryItem; plant: MedicinalPlant }> = [];

  for (const item of inventory) {
    const plant = getPlantById(item.plantId);
    if (plant) {
      result.push({
        inventoryItem: item,
        plant
      });
    }
  }

  return result;
}

/**
 * Check garden availability for recipes substituting a given Ayurvedic medicine ID
 */
export async function getHomeRemedyAlternatives(
  ayurvedicMedicineId: string
): Promise<EnrichedHomeRemedyRecipe[]> {
  const matchingRecipes = homeRemedies.filter(
    (r) => r.replaces_medicine_id === ayurvedicMedicineId
  );

  if (matchingRecipes.length === 0) {
    return [];
  }

  const currentInventory = await db.gardenInventory.toArray();
  const inventoryMap = new Map<string, GardenInventoryItem>();
  currentInventory.forEach((item) => inventoryMap.set(item.plantId, item));

  return matchingRecipes.map((recipe) => {
    const missingPlants: string[] = [];

    for (const req of recipe.required_plants) {
      const invItem = inventoryMap.get(req.plantId);
      // Available if item exists in inventory and quantity is non-zero (or -1 for plentiful)
      const isAvailable = invItem && (invItem.quantity > 0 || invItem.quantity === -1);
      if (!isAvailable) {
        missingPlants.push(req.plantId);
      }
    }

    return {
      ...recipe,
      available: missingPlants.length === 0,
      missingPlants
    };
  });
}

/**
 * Add or update a plant in the garden inventory
 */
export async function addPlantToGarden(
  plantId: string,
  quantity: number,
  notes: string = ''
): Promise<void> {
  const existing = await db.gardenInventory.where('plantId').equals(plantId).first();
  const now = new Date().toISOString();

  if (existing && existing.id !== undefined) {
    await db.gardenInventory.update(existing.id, {
      quantity,
      notes,
      lastUpdated: now
    });
  } else {
    await db.gardenInventory.add({
      plantId,
      quantity,
      notes,
      lastUpdated: now
    });
  }
}

/**
 * Remove a plant from garden inventory
 */
export async function removePlantFromGarden(plantId: string): Promise<void> {
  const existing = await db.gardenInventory.where('plantId').equals(plantId).first();
  if (existing && existing.id !== undefined) {
    await db.gardenInventory.delete(existing.id);
  }
}

/**
 * Update plant quantity in garden inventory
 */
export async function updatePlantQuantity(
  plantId: string,
  quantity: number,
  notes?: string
): Promise<void> {
  const existing = await db.gardenInventory.where('plantId').equals(plantId).first();
  if (existing && existing.id !== undefined) {
    await db.gardenInventory.update(existing.id, {
      quantity,
      ...(notes !== undefined ? { notes } : {}),
      lastUpdated: new Date().toISOString()
    });
  }
}

/**
 * Helper to seed initial default garden plants if inventory is completely empty
 */
export async function seedDefaultGardenIfEmpty(): Promise<void> {
  const count = await db.gardenInventory.count();
  if (count === 0) {
    const defaultStarterPlants = [
      { plantId: 'tulsi', quantity: -1, notes: 'Plentiful around clinic' },
      { plantId: 'ginger', quantity: 5, notes: 'Fresh kitchen garden patch' },
      { plantId: 'mint', quantity: -1, notes: 'Plentiful potted herbs' },
      { plantId: 'aloe_vera', quantity: 4, notes: 'Healthy mature plants' }
    ];

    const now = new Date().toISOString();
    for (const item of defaultStarterPlants) {
      await db.gardenInventory.add({
        ...item,
        lastUpdated: now
      });
    }
  }
}
