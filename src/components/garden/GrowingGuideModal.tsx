import React from 'react';
import { useTranslation } from 'react-i18next';
import { X, Sun, Sprout, Droplets, Scissors, ShieldAlert, Plus, Check } from 'lucide-react';
import { MedicinalPlant, LanguageCode } from '../../types';
import { addPlantToGarden } from '../../engine/gardenAdvisor';

interface GrowingGuideModalProps {
  plant: MedicinalPlant | null;
  onClose: () => void;
  isInInventory?: boolean;
  onInventoryUpdated?: () => void;
}

export const GrowingGuideModal: React.FC<GrowingGuideModalProps> = ({
  plant,
  onClose,
  isInInventory = false,
  onInventoryUpdated
}) => {
  const { i18n, t } = useTranslation();
  const currentLang = (i18n.language || 'en') as LanguageCode;

  if (!plant) return null;

  const langKey = currentLang in plant.name ? currentLang : 'en';

  const name = plant.name[langKey] || plant.name.en;
  const description = plant.description[langKey] || plant.description.en;
  const guide = plant.growing_guide;

  const climateText = guide.climate[langKey] || guide.climate.en;
  const soilText = guide.soil[langKey] || guide.soil.en;
  const wateringText = guide.watering[langKey] || guide.watering.en;
  const harvestingText = guide.harvesting[langKey] || guide.harvesting.en;
  const pestsText = guide.pests[langKey] || guide.pests.en;

  const handleQuickAdd = async () => {
    await addPlantToGarden(plant.id, -1, 'Added from growing guide');
    if (onInventoryUpdated) onInventoryUpdated();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col border border-emerald-100 dark:border-emerald-900/30">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-700 to-teal-800 text-white p-5 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Sprout className="w-6 h-6 text-emerald-200" />
              <h3 className="text-xl font-bold">{name}</h3>
            </div>
            {plant.scientificName && (
              <p className="text-sm text-emerald-100 italic mt-0.5">{plant.scientificName}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-emerald-100 hover:text-white bg-emerald-800/40 p-1.5 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-slate-800 dark:text-slate-200">
          {/* Description */}
          <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300 bg-emerald-50/50 dark:bg-emerald-950/20 p-3 rounded-xl border border-emerald-100/60 dark:border-emerald-900/20">
            {description}
          </p>

          {/* Parts used & Season */}
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 font-medium px-3 py-1 rounded-full">
              {t('garden.partsUsed')}: {plant.parts_used.join(', ')}
            </span>
            <span className="bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300 font-medium px-3 py-1 rounded-full">
              {t('garden.availability')}: {t(`garden.${plant.availability_season}`, plant.availability_season)}
            </span>
          </div>

          <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider text-xs border-b border-slate-200 dark:border-slate-800 pb-1 mt-2">
            {t('garden.growingGuide')}
          </h4>

          {/* Guide Sections */}
          <div className="space-y-3">
            <div className="flex items-start gap-3 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl">
              <Sun className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  {t('garden.climate')}
                </span>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">{climateText}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl">
              <Sprout className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  {t('garden.soil')}
                </span>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">{soilText}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl">
              <Droplets className="w-5 h-5 text-cyan-600 shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  {t('garden.watering')}
                </span>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">{wateringText}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl">
              <Scissors className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  {t('garden.harvesting')}
                </span>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">{harvestingText}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl">
              <ShieldAlert className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  {t('garden.pests')}
                </span>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">{pestsText}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          {isInInventory ? (
            <div className="flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400 font-medium">
              <Check className="w-4 h-4" />
              <span>In Garden Inventory</span>
            </div>
          ) : (
            <button
              onClick={handleQuickAdd}
              className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 rounded-xl text-xs font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>{t('garden.addToInventory')}</span>
            </button>
          )}

          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
