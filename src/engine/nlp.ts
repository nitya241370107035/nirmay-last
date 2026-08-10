import Fuse from 'fuse.js';
import symptomLexiconData from '../data/symptom_lexicon.json';
import { transliterate } from './transliterate';

export { transliterate };

export interface LexiconItem {
  phrases: string[];
  weight: number;
  type: 'symptom' | 'redflag';
}

export type SymptomLexicon = Record<string, LexiconItem>;

const lexicon = symptomLexiconData as SymptomLexicon;

// Prepare Fuse search dataset
interface FuseEntry {
  id: string;
  phrases: string[];
  weight: number;
  type: 'symptom' | 'redflag';
}

const searchEntries: FuseEntry[] = Object.entries(lexicon).map(([id, data]) => ({
  id,
  phrases: data.phrases,
  weight: data.weight,
  type: data.type,
}));

// Configure Fuse.js as instructed
const fuse = new Fuse(searchEntries, {
  includeScore: true,
  threshold: 0.4,
  minMatchCharLength: 3,
  ignoreLocation: true,
  keys: ['phrases'],
});

const NEGATION_WORDS = [
  'no',
  'not',
  'nahi',
  'nhi',
  'nahee',
  'nathi',
  'nako',
  'without',
  'na',
  'vina',
  'vaghar',
  'bina',
];

/**
 * Checks if a specific symptom or phrase is negated in the text.
 */
export function detectNegation(text: string, phrase: string): boolean {
  if (!text || !phrase) return false;
  const lowerText = text.toLowerCase();
  const lowerPhrase = phrase.toLowerCase();

  const phraseIndex = lowerText.indexOf(lowerPhrase);
  if (phraseIndex === -1) return false;

  // Look at words within 30 characters before or after the phrase
  const beforeSnippet = lowerText.slice(Math.max(0, phraseIndex - 35), phraseIndex);
  const afterSnippet = lowerText.slice(phraseIndex + lowerPhrase.length, phraseIndex + lowerPhrase.length + 35);

  const wordsBefore = beforeSnippet.split(/\s+/);
  const wordsAfter = afterSnippet.split(/\s+/);

  const hasNegationBefore = wordsBefore.some((w) => NEGATION_WORDS.includes(w.replace(/[^a-z]/g, '')));
  const hasNegationAfter = wordsAfter.some((w) => NEGATION_WORDS.includes(w.replace(/[^a-z]/g, '')));

  return hasNegationBefore || hasNegationAfter;
}

/**
 * Extracts canonical symptom IDs from free text in English, Gujarati, or Hindi.
 */
export function extractSymptoms(
  text: string,
  lang?: string
): { symptoms: string[]; redFlags: string[]; extracted: Array<{ id: string; weight: number; type: string }> } {
  if (!text || !text.trim()) {
    return { symptoms: [], redFlags: [], extracted: [] };
  }

  // 1. Transliterate input if script is Gujarati or Devanagari
  const transliteratedText = transliterate(text, lang);

  // 2. Clean text: remove punctuation except spaces, convert to lowercase
  const cleanedText = transliteratedText
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleanedText) {
    return { symptoms: [], redFlags: [], extracted: [] };
  }

  // Direct keyword matching on cleanedText first (fast path for exact matches)
  const matchedIds = new Set<string>();

  Object.entries(lexicon).forEach(([id, item]) => {
    for (const p of item.phrases) {
      const cleanP = p.toLowerCase().trim();
      if (cleanP.length >= 3 && cleanedText.includes(cleanP)) {
        if (!detectNegation(cleanedText, cleanP)) {
          matchedIds.add(id);
          break;
        }
      }
    }
  });

  // 3. Fuse.js search on full text and word tokens
  const fuseResults = fuse.search(cleanedText);
  for (const res of fuseResults) {
    if (res.score !== undefined && res.score <= 0.4) {
      const item = res.item;
      // Check if matched phrase is negated
      const matchedPhrase = item.phrases[0] || item.id;
      if (!detectNegation(cleanedText, matchedPhrase)) {
        matchedIds.add(item.id);
      }
    }
  }

  // Tokenize and match word chunks for multi-word phrases
  const tokens = cleanedText.split(/\s+/);
  for (let i = 0; i < tokens.length; i++) {
    // Single, bigram, trigram
    const chunk1 = tokens[i];
    const chunk2 = tokens.slice(i, i + 2).join(' ');
    const chunk3 = tokens.slice(i, i + 3).join(' ');

    [chunk1, chunk2, chunk3].forEach((chunk) => {
      if (chunk && chunk.length >= 3) {
        const chunkResults = fuse.search(chunk);
        for (const res of chunkResults) {
          if (res.score !== undefined && res.score <= 0.35) {
            const item = res.item;
            if (!detectNegation(cleanedText, chunk)) {
              matchedIds.add(item.id);
            }
          }
        }
      }
    });
  }

  const symptomsList = Array.from(matchedIds);
  const redFlagsList = symptomsList.filter((id) => lexicon[id]?.type === 'redflag');
  const extractedDetails = symptomsList.map((id) => ({
    id,
    weight: lexicon[id]?.weight || 5,
    type: lexicon[id]?.type || 'symptom',
  }));

  return {
    symptoms: symptomsList,
    redFlags: redFlagsList,
    extracted: extractedDetails,
  };
}

/**
 * Number word to numeric digit mapping.
 */
const NUMBER_WORDS: Record<string, number> = {
  ek: 1,
  one: 1,
  a: 1,
  an: 1,
  be: 2,
  do: 2,
  two: 2,
  tran: 3,
  teen: 3,
  tin: 3,
  three: 3,
  chaar: 4,
  char: 4,
  four: 4,
  paanch: 5,
  panch: 5,
  five: 5,
  chhah: 6,
  chh: 6,
  six: 6,
  saat: 7,
  sat: 7,
  seven: 7,
  aath: 8,
  ath: 8,
  eight: 8,
  nau: 9,
  nauv: 9,
  nine: 9,
  das: 10,
  dash: 10,
  ten: 10,
  pandrah: 15,
  pandra: 15,
  fifteen: 15,
  bees: 20,
  bis: 20,
  twenty: 20,
  mats: 30,
};

/**
 * Parses duration in days from free text (e.g., "2 din", "3 divas", "1 week", "ek mahina").
 */
export function extractDuration(text: string): number | null {
  if (!text) return null;

  const transliterated = transliterate(text);
  const lower = transliterated.toLowerCase();

  // Regex patterns for number + unit
  // e.g., "2 days", "3 din", "15 divas", "1 week", "2 mahina"
  const regexNum = /(\d+)\s*(days?|day|din|divas|dino|hafta|hafte|week|weeks|mahina|mahine|month|months)/i;
  const matchNum = lower.match(regexNum);

  if (matchNum) {
    const val = parseInt(matchNum[1], 10);
    const unit = matchNum[2].toLowerCase();

    if (unit.startsWith('month') || unit.startsWith('mahin')) {
      return val * 30;
    }
    if (unit.startsWith('week') || unit.startsWith('haft')) {
      return val * 7;
    }
    return val;
  }

  // Regex for word numbers + unit
  // e.g., "ek mahina", "be divas", "tran din", "two weeks"
  const regexWord = /(ek|one|be|do|two|tran|teen|tin|three|chaar|char|four|paanch|panch|five|chhah|chh|six|saat|sat|seven|aath|ath|eight|nau|nine|das|ten|pandrah|bees)\s*(days?|day|din|divas|dino|hafta|hafte|week|weeks|mahina|mahine|month|months)/i;
  const matchWord = lower.match(regexWord);

  if (matchWord) {
    const numWord = matchWord[1].toLowerCase();
    const unit = matchWord[2].toLowerCase();
    const val = NUMBER_WORDS[numWord] || 1;

    if (unit.startsWith('month') || unit.startsWith('mahin')) {
      return val * 30;
    }
    if (unit.startsWith('week') || unit.startsWith('haft')) {
      return val * 7;
    }
    return val;
  }

  return null;
}

/**
 * Helper to extract severity hint from free text ('severe' | 'moderate' | 'mild' | null).
 */
export function extractSeverity(text: string): 'severe' | 'moderate' | 'mild' | null {
  if (!text) return null;
  const lower = transliterate(text).toLowerCase();

  if (/severe|bahut tez|ghani taklif|vadhare|asamhy|asahy|bohot jyada|tez/.test(lower)) {
    return 'severe';
  }
  if (/moderate|thoda vadhare|madhyam|thoda tez/.test(lower)) {
    return 'moderate';
  }
  if (/mild|halka|thodu|dheemag|chota/.test(lower)) {
    return 'mild';
  }

  return null;
}
