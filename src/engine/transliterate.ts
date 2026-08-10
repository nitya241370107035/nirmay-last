import gujaratiMap from '../data/gujarati_translit.json';
import hindiMap from '../data/hindi_translit.json';

type TranslitMap = Record<string, string>;

// Prepare maps sorted by key length descending to replace multi-char conjuncts first
function prepareSortedEntries(mapObj: TranslitMap): Array<[string, string]> {
  return Object.entries(mapObj).sort((a, b) => b[0].length - a[0].length);
}

const sortedGujarati = prepareSortedEntries(gujaratiMap as TranslitMap);
const sortedHindi = prepareSortedEntries(hindiMap as TranslitMap);

/**
 * Transliterates Gujarati/Hindi script input into Roman script.
 * Pure TypeScript rule-based transliterator under 50KB.
 */
export function transliterate(text: string, lang?: string): string {
  if (!text) return '';

  // 1. Normalize Unicode (NFC)
  let normalized = text.normalize('NFC');

  // Determine script based on lang or character inspection
  const hasGujarati = /[\u0A80-\u0AFF]/.test(normalized);
  const hasDevanagari = /[\u0900-\u097F]/.test(normalized);

  if (!hasGujarati && !hasDevanagari && lang !== 'gu' && lang !== 'hi') {
    // English or already Romanized input
    return normalized.toLowerCase().trim();
  }

  let result = '';
  let i = 0;
  const len = normalized.length;

  while (i < len) {
    const charCode = normalized.charCodeAt(i);

    // Check if character is Gujarati or Hindi/Devanagari range
    const isGuChar = charCode >= 0x0a80 && charCode <= 0x0aff;
    const isHiChar = charCode >= 0x0900 && charCode <= 0x097f;

    if (!isGuChar && !isHiChar) {
      result += normalized[i];
      i++;
      continue;
    }

    const currentSorted = isGuChar ? sortedGujarati : sortedHindi;
    let matched = false;

    // Try matching longest sequence from character map first
    for (const [key, replacement] of currentSorted) {
      if (normalized.startsWith(key, i)) {
        result += replacement;
        i += key.length;
        matched = true;
        break;
      }
    }

    if (!matched) {
      result += normalized[i];
      i++;
    }
  }

  // Clean up duplicate spaces or weird artifacts, convert to lowercase
  return result
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .trim();
}
