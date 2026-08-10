import { useState, useEffect, useRef, useCallback } from 'react';

interface UseSpeechOptions {
  language?: 'en' | 'hi' | 'gu' | string;
  rate?: number;
  pitch?: number;
}

export function useSpeech(options: UseSpeechOptions = {}) {
  const { language = 'en', rate = 0.95, pitch = 1.0 } = options;

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState<number>(-1);
  const [hasVoiceSupport, setHasVoiceSupport] = useState<boolean>(true);
  const [voiceMessage, setVoiceMessage] = useState<string | null>(null);

  const sentencesRef = useRef<string[]>([]);
  const currentIndexRef = useRef<number>(0);
  const isCancelledRef = useRef<boolean>(false);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
    } else {
      setHasVoiceSupport(false);
      setVoiceMessage('Speech synthesis is not supported on this device/browser.');
    }
  }, []);

  const getLangCode = useCallback((lang: string): string => {
    if (lang === 'hi') return 'hi-IN';
    if (lang === 'gu') return 'gu-IN';
    if (lang === 'en') return 'en-IN';
    return lang;
  }, []);

  const getVoice = useCallback((lang: string): SpeechSynthesisVoice | null => {
    if (!synthRef.current) return null;
    const voices = synthRef.current.getVoices();
    const targetLang = getLangCode(lang).toLowerCase();
    const prefix = lang.toLowerCase();

    // 1. Exact match (e.g. hi-IN)
    let selected = voices.find((v) => v.lang.toLowerCase() === targetLang);
    if (selected) return selected;

    // 2. Starts with language code (e.g. hi or gu)
    selected = voices.find((v) => v.lang.toLowerCase().startsWith(prefix));
    if (selected) return selected;

    // 3. Fallback to any Indian voice or default
    selected = voices.find((v) => v.lang.toLowerCase().includes('in'));
    if (selected) return selected;

    return voices[0] || null;
  }, [getLangCode]);

  const speakSentence = useCallback(
    (index: number) => {
      if (!synthRef.current) return;
      if (index >= sentencesRef.current.length || isCancelledRef.current) {
        setIsSpeaking(false);
        setIsPaused(false);
        setCurrentSentenceIndex(-1);
        return;
      }

      currentIndexRef.current = index;
      setCurrentSentenceIndex(index);

      const sentence = sentencesRef.current[index];
      const utterance = new SpeechSynthesisUtterance(sentence);

      utterance.lang = getLangCode(language);
      utterance.rate = rate;
      utterance.pitch = pitch;

      const matchedVoice = getVoice(language);
      if (matchedVoice) {
        utterance.voice = matchedVoice;
      }

      utterance.onend = () => {
        if (!isCancelledRef.current && !synthRef.current?.paused) {
          speakSentence(index + 1);
        }
      };

      utterance.onerror = (e) => {
        console.warn('Speech synthesis error:', e);
        if (!isCancelledRef.current) {
          speakSentence(index + 1);
        }
      };

      setIsSpeaking(true);
      setIsPaused(false);
      synthRef.current.speak(utterance);
    },
    [language, rate, pitch, getLangCode, getVoice]
  );

  const speak = useCallback(
    (text: string) => {
      if (!synthRef.current) {
        setVoiceMessage('Voice synthesis unavailable on this browser.');
        return;
      }

      // Stop previous
      synthRef.current.cancel();
      isCancelledRef.current = false;

      // Check if voice exists for language
      const voice = getVoice(language);
      if (!voice) {
        setVoiceMessage(`Voice for language '${language.toUpperCase()}' not found. Using device default.`);
      } else {
        setVoiceMessage(null);
      }

      // Split text by sentences (handles English '.', Hindi '।', and Gujarati '।', '?', '!')
      const splitRegex = /([.!?।]\s+)/;
      const rawChunks = text.split(splitRegex);
      const sentences: string[] = [];

      for (let i = 0; i < rawChunks.length; i += 2) {
        const sentence = (rawChunks[i] || '') + (rawChunks[i + 1] || '');
        const trimmed = sentence.trim();
        if (trimmed) {
          sentences.push(trimmed);
        }
      }

      if (sentences.length === 0) {
        sentences.push(text);
      }

      sentencesRef.current = sentences;
      currentIndexRef.current = 0;
      speakSentence(0);
    },
    [language, getVoice, speakSentence]
  );

  const pause = useCallback(() => {
    if (synthRef.current && isSpeaking) {
      synthRef.current.pause();
      setIsPaused(true);
    }
  }, [isSpeaking]);

  const resume = useCallback(() => {
    if (synthRef.current && isPaused) {
      synthRef.current.resume();
      setIsPaused(false);
    }
  }, [isPaused]);

  const stop = useCallback(() => {
    if (synthRef.current) {
      isCancelledRef.current = true;
      synthRef.current.cancel();
      setIsSpeaking(false);
      setIsPaused(false);
      setCurrentSentenceIndex(-1);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, []);

  return {
    speak,
    pause,
    resume,
    stop,
    isSpeaking,
    isPaused,
    hasVoiceSupport,
    voiceMessage,
    currentSentenceIndex,
  };
}
