import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Sprout,
  CheckCircle2,
  XCircle,
  Clock,
  FlaskConical,
  AlertTriangle,
  BookmarkPlus,
  Share2,
  PlusCircle,
  BookOpen,
  Check
} from 'lucide-react';
import { EnrichedHomeRemedyRecipe, MedicinalPlant, LanguageCode } from '../../types';
import {
  getHomeRemedyAlternatives,
  getPlantById,
  addPlantToGarden
} from '../../engine/gardenAdvisor';
import { GrowingGuideModal } from './GrowingGuideModal';

interface HomeRemedyCardProps {
  medicineId: string;
  patientId?: number;
  onSaveToAdvice?: (remedySummary: string) => void;
}

export const HomeRemedyCard: React.FC<HomeRemedyCardProps> = ({
  medicineId,
  onSaveToAdvice
}) => {
  const { i18n, t } = useTranslation();
  const currentLang = (i18n.language || 'en') as LanguageCode;

  const [remedies, setRemedies] = useState<EnrichedHomeRemedyRecipe[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedPlant, setSelectedPlant] = useState<MedicinalPlant | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);

  const loadRemedies = async () => {
    setLoading(true);
    try {
      const data = await getHomeRemedyAlternatives(medicineId);
      setRemedies(data);
    } catch (err) {
      console.error('Error loading home remedies:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRemedies();
  }, [medicineId]);

  if (loading || remedies.length === 0) {
    return null;
  }

  const handleAddMissingPlant = async (plantId: string) => {
    await addPlantToGarden(plantId, -1, 'Added from remedy suggestion');
    await loadRemedies();
  };

  const formatRemedyForSharing = (recipe: EnrichedHomeRemedyRecipe): string => {
    const lang = currentLang in recipe.recipe_name ? currentLang : 'en';
    const name = recipe.recipe_name[lang] || recipe.recipe_name.en;
    const desc = recipe.description[lang] || recipe.description.en;
    const dosageStr = recipe.dosage[lang] || recipe.dosage.en;
    const shelfStr = recipe.shelf_life[lang] || recipe.shelf_life.en;

    const plantsList = recipe.required_plants
      .map((rp) => {
        const plant = getPlantById(rp.plantId);
        const pName = plant ? plant.name[lang] || plant.name.en : rp.plantId;
        return `- ${pName}: ${rp.quantity} ${rp.unit}`;
      })
      .join('\n');

    const stepsList = recipe.preparation_steps
      .map((step, idx) => `${idx + 1}. ${step[lang] || step.en}`)
      .join('\n');

    return `*${name}*\n${desc}\n\n*Required Plants:*\n${plantsList}\n\n*Preparation Steps:*\n${stepsList}\n\n*Dosage:* ${dosageStr}\n*Shelf Life:* ${shelfStr}`;
  };

  const handleCopyRemedy = (recipe: EnrichedHomeRemedyRecipe) => {
    const text = formatRemedyForSharing(recipe);
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
    }
    setCopiedId(recipe.id);
    setTimeout(() => setCopiedId(null), 3000);
  };

  const handleSaveRemedyToAdvice = (recipe: EnrichedHomeRemedyRecipe) => {
    const text = formatRemedyForSharing(recipe);
    if (onSaveToAdvice) {
      onSaveToAdvice(text);
    }
    setSavedId(recipe.id);
    setTimeout(() => setSavedId(null), 3000);
  };

  return (
    <div className="mt-3 space-y-4">
      {remedies.map((recipe) => {
        const lang = currentLang in recipe.recipe_name ? currentLang : 'en';
        const recipeName = recipe.recipe_name[lang] || recipe.recipe_name.en;
        const recipeDesc = recipe.description[lang] || recipe.description.en;
        const dosageText = recipe.dosage[lang] || recipe.dosage.en;
        const shelfText = recipe.shelf_life[lang] || recipe.shelf_life.en;
        const cautionText = recipe.contraindications
          ? recipe.contraindications[lang] || recipe.contraindications.en
          : null;

        return (
          <div
            key={recipe.id}
            className={`rounded-2xl border transition-all overflow-hidden ${
              recipe.available
                ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40 shadow-xs'
                : 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/40'
            }`}
          >
            {/* Banner Header */}
            <div
              className={`p-3.5 px-4 flex items-center justify-between text-xs font-semibold ${
                recipe.available
                  ? 'bg-emerald-700 text-white'
                  : 'bg-amber-600 text-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <Sprout className="w-4 h-4 shrink-0" />
                <span>
                  {recipe.available
                    ? t('garden.homeRemedyAvailable')
                    : t('garden.homeRemedyMissing')}
                </span>
              </div>
            </div>

            {/* Body */}
            <div className="p-4 space-y-3.5">
              <div>
                <h4 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  {recipeName}
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                  {recipeDesc}
                </p>
              </div>

              {/* Required Plants List */}
              <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block uppercase tracking-wider">
                  Required Fresh Garden Plants
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {recipe.required_plants.map((rp) => {
                    const plant = getPlantById(rp.plantId);
                    const pName = plant ? plant.name[lang] || plant.name.en : rp.plantId;
                    const isMissing = recipe.missingPlants.includes(rp.plantId);

                    return (
                      <div
                        key={rp.plantId}
                        className={`flex items-center justify-between p-2 rounded-lg text-xs border ${
                          isMissing
                            ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/50 text-amber-900 dark:text-amber-200'
                            : 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/50 text-emerald-900 dark:text-emerald-200'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {isMissing ? (
                            <XCircle className="w-4 h-4 text-amber-600 shrink-0" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          )}
                          <button
                            onClick={() => plant && setSelectedPlant(plant)}
                            className="font-medium underline decoration-dashed hover:text-emerald-700 text-left"
                          >
                            {pName}
                          </button>
                          <span className="text-slate-500 text-[10px]">
                            ({rp.quantity} {rp.unit})
                          </span>
                        </div>

                        {isMissing && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => plant && setSelectedPlant(plant)}
                              title={t('garden.viewGrowingGuide')}
                              className="p-1 text-amber-700 hover:bg-amber-100 rounded"
                            >
                              <BookOpen className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleAddMissingPlant(rp.plantId)}
                              title={t('garden.addToInventory')}
                              className="p-1 bg-amber-600 text-white hover:bg-amber-700 rounded flex items-center gap-0.5 text-[10px] px-1.5 font-medium"
                            >
                              <PlusCircle className="w-3 h-3" />
                              <span>Add</span>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Other Kitchen Ingredients */}
                {recipe.other_ingredients && recipe.other_ingredients.length > 0 && (
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                      Kitchen Items Required:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {recipe.other_ingredients.map((oi, idx) => {
                        const itemLabel = oi.multilingual ? oi.multilingual[lang] || oi.multilingual.en : oi.item;
                        return (
                          <span
                            key={idx}
                            className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] px-2 py-0.5 rounded-md"
                          >
                            {itemLabel} ({oi.quantity})
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Preparation Steps */}
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block uppercase tracking-wider">
                  {t('garden.preparation')}
                </span>
                <ol className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300 list-decimal list-inside bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800">
                  {recipe.preparation_steps.map((step, idx) => {
                    const stepText = step[lang] || step.en;
                    return (
                      <li key={idx} className="leading-relaxed pl-1">
                        {stepText}
                      </li>
                    );
                  })}
                </ol>
              </div>

              {/* Dosage & Shelf Life */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 flex items-start gap-2">
                  <FlaskConical className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-200 block">
                      {t('garden.dosage')}
                    </span>
                    <p className="text-slate-600 dark:text-slate-400 mt-0.5 leading-snug">
                      {dosageText}
                    </p>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 flex items-start gap-2">
                  <Clock className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-200 block">
                      {t('garden.shelfLife')}
                    </span>
                    <p className="text-slate-600 dark:text-slate-400 mt-0.5 leading-snug">
                      {shelfText}
                    </p>
                  </div>
                </div>
              </div>

              {/* Caution / Contraindications */}
              {cautionText && (
                <div className="bg-rose-50 dark:bg-rose-950/20 p-2.5 rounded-xl border border-rose-200 dark:border-rose-900/30 flex items-start gap-2 text-xs text-rose-800 dark:text-rose-300">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">{t('garden.contraindications')}:</span>
                    <p className="mt-0.5 leading-snug">{cautionText}</p>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => handleSaveRemedyToAdvice(recipe)}
                  className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  {savedId === recipe.id ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-200" />
                      <span>Saved</span>
                    </>
                  ) : (
                    <>
                      <BookmarkPlus className="w-3.5 h-3.5" />
                      <span>{t('garden.saveToAdvice')}</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => handleCopyRemedy(recipe)}
                  className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 py-2 px-3 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition-colors border border-slate-200 dark:border-slate-700"
                >
                  {copiedId === recipe.id ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Share</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        );
      })}

      {/* Growing Guide Modal */}
      {selectedPlant && (
        <GrowingGuideModal
          plant={selectedPlant}
          onClose={() => setSelectedPlant(null)}
          onInventoryUpdated={loadRemedies}
        />
      )}
    </div>
  );
};
