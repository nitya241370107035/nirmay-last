import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Sprout,
  Plus,
  Search,
  BookOpen,
  Trash2,
  Edit2,
  Check,
  X,
  Sparkles,
  ArrowLeft
} from 'lucide-react';
import { MedicinalPlant, GardenInventoryItem, LanguageCode } from '../../types';
import {
  getAllGardenPlants,
  getPlantCatalogue,
  addPlantToGarden,
  removePlantFromGarden,
  updatePlantQuantity,
  seedDefaultGardenIfEmpty
} from '../../engine/gardenAdvisor';
import { GrowingGuideModal } from './GrowingGuideModal';

interface GardenInventoryManagerProps {
  onBack?: () => void;
}

export const GardenInventoryManager: React.FC<GardenInventoryManagerProps> = ({ onBack }) => {
  const { i18n, t } = useTranslation();
  const currentLang = (i18n.language || 'en') as LanguageCode;

  const [gardenList, setGardenList] = useState<
    Array<{ inventoryItem: GardenInventoryItem; plant: MedicinalPlant }>
  >([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Modals state
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [selectedPlantForGuide, setSelectedPlantForGuide] = useState<MedicinalPlant | null>(null);
  const [editingItem, setEditingItem] = useState<{
    plant: MedicinalPlant;
    item: GardenInventoryItem;
  } | null>(null);

  // Add Plant Modal Form state
  const [plantSearch, setPlantSearch] = useState<string>('');
  const [selectedPlantToAdd, setSelectedPlantToAdd] = useState<MedicinalPlant | null>(null);
  const [addQuantity, setAddQuantity] = useState<number>(5);
  const [addIsPlentiful, setAddIsPlentiful] = useState<boolean>(false);
  const [addNotes, setAddNotes] = useState<string>('');

  // Edit Quantity Form state
  const [editQuantity, setEditQuantity] = useState<number>(1);
  const [editIsPlentiful, setEditIsPlentiful] = useState<boolean>(false);
  const [editNotes, setEditNotes] = useState<string>('');

  const loadGarden = async () => {
    setLoading(true);
    try {
      await seedDefaultGardenIfEmpty();
      const items = await getAllGardenPlants();
      setGardenList(items);
    } catch (err) {
      console.error('Error loading garden inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGarden();
  }, []);

  const catalogue = getPlantCatalogue();

  // Filtered garden items based on search
  const filteredGarden = gardenList.filter(({ plant }) => {
    const lang = currentLang in plant.name ? currentLang : 'en';
    const name = (plant.name[lang] || plant.name.en).toLowerCase();
    const sciName = (plant.scientificName || '').toLowerCase();
    const query = searchTerm.toLowerCase();
    return name.includes(query) || sciName.includes(query);
  });

  // Filtered catalogue for adding new plant
  const filteredCatalogue = catalogue.filter((plant) => {
    const lang = currentLang in plant.name ? currentLang : 'en';
    const name = (plant.name[lang] || plant.name.en).toLowerCase();
    const sciName = (plant.scientificName || '').toLowerCase();
    const query = plantSearch.toLowerCase();
    return name.includes(query) || sciName.includes(query);
  });

  const handleSaveAddPlant = async () => {
    if (!selectedPlantToAdd) return;
    const qty = addIsPlentiful ? -1 : addQuantity;
    await addPlantToGarden(selectedPlantToAdd.id, qty, addNotes);
    setSelectedPlantToAdd(null);
    setShowAddModal(false);
    setPlantSearch('');
    setAddNotes('');
    loadGarden();
  };

  const handleOpenEdit = (plant: MedicinalPlant, item: GardenInventoryItem) => {
    setEditingItem({ plant, item });
    setEditQuantity(item.quantity === -1 ? 5 : item.quantity);
    setEditIsPlentiful(item.quantity === -1);
    setEditNotes(item.notes || '');
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;
    const qty = editIsPlentiful ? -1 : editQuantity;
    await updatePlantQuantity(editingItem.plant.id, qty, editNotes);
    setEditingItem(null);
    loadGarden();
  };

  const handleDeletePlant = async (plantId: string) => {
    await removePlantFromGarden(plantId);
    loadGarden();
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-br from-emerald-800 via-teal-900 to-emerald-950 text-white p-6 rounded-3xl shadow-xl relative overflow-hidden border border-emerald-700/50">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            {onBack && (
              <button
                onClick={onBack}
                className="inline-flex items-center gap-1.5 text-xs text-emerald-200 hover:text-white bg-emerald-900/50 px-3 py-1.5 rounded-full mb-2 transition-colors border border-emerald-700/50"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            )}
            <div className="flex items-center gap-2.5">
              <div className="bg-emerald-600/50 p-2.5 rounded-2xl backdrop-blur-xs border border-emerald-400/30">
                <Sprout className="w-7 h-7 text-emerald-200" />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight">{t('garden.title')}</h1>
                <p className="text-xs text-emerald-200/90 font-medium">
                  {t('garden.subtitle')}
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              setSelectedPlantToAdd(null);
              setShowAddModal(true);
            }}
            className="bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-bold px-5 py-3 rounded-2xl shadow-lg flex items-center justify-center gap-2 transition-all text-xs sm:text-sm self-start sm:self-auto shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>{t('garden.addPlant')}</span>
          </button>
        </div>

        {/* Stats Strip */}
        <div className="mt-6 pt-4 border-t border-emerald-700/40 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
          <div className="bg-emerald-950/40 p-3 rounded-xl border border-emerald-800/40">
            <span className="text-emerald-300 block font-medium text-[11px]">Garden Species</span>
            <span className="text-xl font-bold text-white mt-0.5 block">{gardenList.length}</span>
          </div>
          <div className="bg-emerald-950/40 p-3 rounded-xl border border-emerald-800/40">
            <span className="text-emerald-300 block font-medium text-[11px]">Plentiful Herbs</span>
            <span className="text-xl font-bold text-white mt-0.5 block">
              {gardenList.filter((i) => i.inventoryItem.quantity === -1).length}
            </span>
          </div>
          <div className="bg-emerald-950/40 p-3 rounded-xl border border-emerald-800/40 col-span-2 sm:col-span-1">
            <span className="text-emerald-300 block font-medium text-[11px]">Catalogue Available</span>
            <span className="text-xl font-bold text-white mt-0.5 block">{catalogue.length} species</span>
          </div>
        </div>
      </div>

      {/* Controls & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t('garden.searchPlant')}
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <span className="text-xs text-slate-500 font-medium self-end sm:self-auto">
          Showing {filteredGarden.length} of {gardenList.length} plants
        </span>
      </div>

      {/* Inventory Grid */}
      {loading ? (
        <div className="py-12 text-center text-xs text-slate-500">Loading garden inventory...</div>
      ) : filteredGarden.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center space-y-3">
          <Sprout className="w-10 h-10 text-slate-400 mx-auto stroke-1" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            {t('garden.noPlantsInGarden')}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchTerm
              ? 'No matching plant found in your garden inventory.'
              : 'Add fresh medicinal plants from the catalogue to enable local home remedies for your patients.'}
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-semibold hover:bg-emerald-800 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>{t('garden.addFirstPlant')}</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredGarden.map(({ inventoryItem, plant }) => {
            const lang = currentLang in plant.name ? currentLang : 'en';
            const name = plant.name[lang] || plant.name.en;
            const description = plant.description[lang] || plant.description.en;
            const isPlentiful = inventoryItem.quantity === -1;

            return (
              <div
                key={plant.id}
                className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-col justify-between hover:border-emerald-300 dark:hover:border-emerald-800 transition-all space-y-3"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white text-base leading-snug">
                        {name}
                      </h3>
                      {plant.scientificName && (
                        <p className="text-xs text-slate-400 dark:text-slate-500 italic">
                          {plant.scientificName}
                        </p>
                      )}
                    </div>

                    <span
                      className={`text-xs font-bold px-2.5 py-1 rounded-full shrink-0 ${
                        isPlentiful
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                          : 'bg-teal-50 text-teal-800 dark:bg-teal-950/50 dark:text-teal-300 border border-teal-200 dark:border-teal-800'
                      }`}
                    >
                      {isPlentiful ? 'Plentiful' : `${inventoryItem.quantity} plants`}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                    {description}
                  </p>

                  {/* Badges */}
                  <div className="flex flex-wrap gap-1.5 mt-3 text-[11px]">
                    <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-md font-medium">
                      Parts: {plant.parts_used.join(', ')}
                    </span>
                    <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-md font-medium">
                      Season: {t(`garden.${plant.availability_season}`, plant.availability_season)}
                    </span>
                  </div>

                  {inventoryItem.notes && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 italic mt-2 bg-slate-50 dark:bg-slate-800/40 p-1.5 px-2 rounded-lg border border-slate-100 dark:border-slate-800">
                      Location / Notes: {inventoryItem.notes}
                    </p>
                  )}
                </div>

                {/* Footer Controls */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <button
                    onClick={() => setSelectedPlantForGuide(plant)}
                    className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-semibold hover:underline"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>{t('garden.viewGrowingGuide')}</span>
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(plant, inventoryItem)}
                      title={t('garden.editPlant')}
                      className="p-1.5 text-slate-600 hover:text-slate-900 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeletePlant(plant.id)}
                      title={t('garden.removePlant')}
                      className="p-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Plant Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col border border-slate-200 dark:border-slate-800">
            <div className="p-5 bg-gradient-to-r from-emerald-800 to-teal-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sprout className="w-5 h-5 text-emerald-300" />
                <h3 className="font-bold text-lg">{t('garden.addPlant')}</h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-white/80 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {!selectedPlantToAdd ? (
                /* Step 1: Select plant from catalogue */
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={plantSearch}
                      onChange={(e) => setPlantSearch(e.target.value)}
                      placeholder="Search catalogue species..."
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                    {filteredCatalogue.map((plant) => {
                      const lang = currentLang in plant.name ? currentLang : 'en';
                      const name = plant.name[lang] || plant.name.en;
                      const isAlreadyInGarden = gardenList.some((g) => g.plant.id === plant.id);

                      return (
                        <div
                          key={plant.id}
                          onClick={() => setSelectedPlantToAdd(plant)}
                          className={`p-3 rounded-xl border text-xs cursor-pointer flex items-center justify-between transition-all ${
                            isAlreadyInGarden
                              ? 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 opacity-75'
                              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20'
                          }`}
                        >
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white block">
                              {name}
                            </span>
                            {plant.scientificName && (
                              <span className="text-[11px] text-slate-400 italic block">
                                {plant.scientificName}
                              </span>
                            )}
                          </div>

                          {isAlreadyInGarden ? (
                            <span className="text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 font-medium px-2 py-0.5 rounded-full">
                              In Garden
                            </span>
                          ) : (
                            <span className="text-emerald-700 dark:text-emerald-400 font-bold text-xs">
                              Select +
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* Step 2: Set quantity and location notes */
                <div className="space-y-4">
                  <div className="bg-emerald-50 dark:bg-emerald-950/30 p-3 rounded-2xl border border-emerald-200 dark:border-emerald-800/40 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white text-sm block">
                        {selectedPlantToAdd.name[currentLang] || selectedPlantToAdd.name.en}
                      </span>
                      <span className="text-xs text-slate-500 italic">
                        {selectedPlantToAdd.scientificName}
                      </span>
                    </div>
                    <button
                      onClick={() => setSelectedPlantToAdd(null)}
                      className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold underline"
                    >
                      Change
                    </button>
                  </div>

                  {/* Plentiful toggle */}
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                    <input
                      type="checkbox"
                      checked={addIsPlentiful}
                      onChange={(e) => setAddIsPlentiful(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                    />
                    <span>{t('garden.plentiful')}</span>
                  </label>

                  {/* Quantity input */}
                  {!addIsPlentiful && (
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                        {t('garden.quantity')} ({t('garden.quantityUnits')})
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="1000"
                        value={addQuantity}
                        onChange={(e) => setAddQuantity(parseInt(e.target.value) || 1)}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200"
                      />
                    </div>
                  )}

                  {/* Location Notes */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                      {t('garden.notes')}
                    </label>
                    <input
                      type="text"
                      value={addNotes}
                      onChange={(e) => setAddNotes(e.target.value)}
                      placeholder={t('garden.notesPlaceholder')}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200"
                    />
                  </div>
                </div>
              )}
            </div>

            {selectedPlantToAdd && (
              <div className="p-4 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveAddPlant}
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-colors"
                >
                  Save Plant
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Quantity Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-5 space-y-4 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                {t('garden.editPlant')} -{' '}
                {editingItem.plant.name[currentLang] || editingItem.plant.name.en}
              </h3>
              <button
                onClick={() => setEditingItem(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <label className="flex items-center gap-2 font-medium text-slate-700 dark:text-slate-300 cursor-pointer bg-slate-50 dark:bg-slate-800 p-3 rounded-xl">
                <input
                  type="checkbox"
                  checked={editIsPlentiful}
                  onChange={(e) => setEditIsPlentiful(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded"
                />
                <span>{t('garden.plentiful')}</span>
              </label>

              {!editIsPlentiful && (
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    {t('garden.quantity')} ({t('garden.quantityUnits')})
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={editQuantity}
                    onChange={(e) => setEditQuantity(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>
              )}

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  {t('garden.notes')}
                </label>
                <input
                  type="text"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setEditingItem(null)}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl font-medium text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-5 py-2 bg-emerald-700 text-white rounded-xl font-bold text-xs"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Growing Guide Modal */}
      {selectedPlantForGuide && (
        <GrowingGuideModal
          plant={selectedPlantForGuide}
          onClose={() => setSelectedPlantForGuide(null)}
          isInInventory={gardenList.some((g) => g.plant.id === selectedPlantForGuide.id)}
          onInventoryUpdated={loadGarden}
        />
      )}
    </div>
  );
};
