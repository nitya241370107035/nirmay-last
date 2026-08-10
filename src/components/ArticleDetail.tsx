import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Volume2, VolumeX, Pause, Play, Share2, Check, BookOpen, Sparkles } from 'lucide-react';
import { LanguageCode } from '../types';
import { useSpeech } from '../hooks/useSpeech';

export interface BodyParagraph {
  type: 'heading' | 'text' | 'illustration';
  content?: { en: string; hi: string; gu: string };
  src?: string;
  alt?: { en: string; hi: string; gu: string };
}

export interface FullArticle {
  id: string;
  category: string;
  title: { en: string; hi: string; gu: string };
  body: BodyParagraph[];
  tags: string[];
}

interface ArticleDetailProps {
  article: FullArticle;
  onBack: () => void;
}

export const ArticleDetail: React.FC<ArticleDetailProps> = ({ article, onBack }) => {
  const { i18n } = useTranslation();
  const currentLang = (i18n.language || 'en') as LanguageCode;

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const {
    speak,
    pause,
    resume,
    stop,
    isSpeaking,
    isPaused,
    voiceMessage,
    currentSentenceIndex,
  } = useSpeech({ language: currentLang });

  const articleTitle = article.title[currentLang] || article.title.en;

  // Extract all text content sequentially for voice reading
  const fullTextToRead = article.body
    .map((item) => {
      if (item.type === 'heading' || item.type === 'text') {
        return item.content ? (item.content[currentLang] || item.content.en) : '';
      }
      return '';
    })
    .filter(Boolean)
    .join('. ');

  const handleVoiceToggle = () => {
    if (isSpeaking) {
      if (isPaused) {
        resume();
      } else {
        pause();
      }
    } else {
      speak(fullTextToRead);
    }
  };

  const handleShare = async () => {
    const summaryText = article.body
      .filter((b) => b.type === 'text' && b.content)
      .map((b) => b.content![currentLang] || b.content!.en)
      .join(' ')
      .slice(0, 300);

    const shareContent = `Health information from Nirāmay: ${articleTitle}.\n\n${summaryText}...`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: articleTitle,
          text: shareContent,
        });
      } catch (err) {
        // User cancelled share or failed
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareContent);
        setToastMessage(
          currentLang === 'gu'
            ? 'સંદેશ કોપી થયો! તમે મેસેજમાં પેસ્ટ કરી શકો છો.'
            : currentLang === 'hi'
            ? 'सामग्री कॉपी हो गई। आप इसे संदेश में पेस्ट कर सकते हैं।'
            : 'Content copied. You can paste it into a message.'
        );
        setTimeout(() => setToastMessage(null), 3000);
      } catch (err) {
        console.error('Clipboard copy failed:', err);
      }
    }
  };

  const categoryLabels: Record<string, { en: string; hi: string; gu: string }> = {
    child_health: { en: 'Child Health', hi: 'बाल स्वास्थ्य', gu: 'બાળ આરોગ્ય' },
    hygiene: { en: 'Hygiene & Water', hi: 'स्वच्छता व जल', gu: 'સ્વચ્છતા અને જળ' },
    nutrition: { en: 'Nutrition', hi: 'पोषण', gu: 'પોષણ' },
    disease_prevention: { en: 'Disease Prevention', hi: 'बीमारी रोकथाम', gu: 'રોગ અટકાવ' },
    maternal_health: { en: 'Maternal Health', hi: 'मातृ स्वास्थ्य', gu: 'માતાનું આરોગ્ય' },
    chronic_care: { en: 'Chronic Care', hi: 'दीर्घकालिक देखभाल', gu: 'દીર્ઘકાલીન સંભાળ' },
  };

  const catObj = categoryLabels[article.category] || { en: article.category, hi: article.category, gu: article.category };

  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-4 py-6 space-y-6 bg-[#F4F7F6] min-h-screen font-sans pb-28">
      {/* Toast Banner */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-[#1B4D4A] text-white px-5 py-3 rounded-xl shadow-xl text-xs font-bold border border-[#2E7D73] flex items-center gap-2 animate-bounce">
          <Check className="w-4 h-4 text-[#B2DFD8]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-[#DDE3E2] pb-3">
        <button
          onClick={() => {
            stop();
            onBack();
          }}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-[#DDE3E2] text-[#1B4D4A] font-bold text-xs hover:bg-[#EDF1F0] transition cursor-pointer shadow-xs"
        >
          <ArrowLeft className="w-4 h-4 text-[#2E7D73]" />
          <span>{currentLang === 'gu' ? 'પાછા જાઓ' : currentLang === 'hi' ? 'वापस जाएं' : 'Back to Library'}</span>
        </button>

        <span className="px-3 py-1 rounded-lg bg-[#E0F2F1] text-[#1B4D4A] text-xs font-bold border border-[#2E7D73]/30">
          {catObj[currentLang] || catObj.en}
        </span>
      </div>

      {/* Title Header */}
      <div className="bg-white rounded-2xl p-6 border border-[#DDE3E2] shadow-card space-y-2">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[#EDF1F0] text-[#1B4D4A] text-[10px] font-mono font-bold uppercase tracking-wider">
          <BookOpen className="w-3.5 h-3.5 text-[#2E7D73]" />
          <span>OFFLINE HEALTH GUIDE</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-[#1B4D4A] leading-tight font-display">
          {articleTitle}
        </h1>
        {voiceMessage && (
          <p className="text-xs text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200">
            ⚠️ {voiceMessage}
          </p>
        )}
      </div>

      {/* Article Content Area */}
      <div className="bg-white rounded-2xl p-6 border border-[#DDE3E2] shadow-card space-y-5 font-sans leading-relaxed">
        {article.body.map((item, idx) => {
          if (item.type === 'heading' && item.content) {
            const headingText = item.content[currentLang] || item.content.en;
            return (
              <h2
                key={idx}
                className="text-lg sm:text-xl font-semibold text-[#1B4D4A] pt-3 pb-1 border-b border-[#DDE3E2] font-display flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-[#2E7D73] shrink-0" />
                <span>{headingText}</span>
              </h2>
            );
          }

          if (item.type === 'text' && item.content) {
            const paragraphText = item.content[currentLang] || item.content.en;
            const isSentenceActive = isSpeaking && currentSentenceIndex === idx;

            return (
              <p
                key={idx}
                className={`text-sm sm:text-base text-[#1A2B2B] leading-relaxed transition-all rounded-lg p-2 ${
                  isSentenceActive
                    ? 'bg-[#E0F2F1] text-[#1B4D4A] font-medium border-l-4 border-[#1B4D4A]'
                    : ''
                }`}
              >
                {paragraphText}
              </p>
            );
          }

          if (item.type === 'illustration' && item.src) {
            const altText = item.alt ? item.alt[currentLang] || item.alt.en : '';
            return (
              <div key={idx} className="my-6 text-center space-y-2">
                <div className="p-2 bg-[#F4F7F6] rounded-2xl border border-[#DDE3E2] inline-block max-w-full">
                  <img
                    src={item.src}
                    alt={altText}
                    className="max-w-full h-auto max-h-72 rounded-xl object-contain mx-auto"
                    referrerPolicy="no-referrer"
                  />
                </div>
                {altText && (
                  <p className="text-xs text-[#5F6D6C] font-mono italic">
                    📷 {altText}
                  </p>
                )}
              </div>
            );
          }

          return null;
        })}

        {/* Tags */}
        <div className="pt-4 border-t border-[#DDE3E2] flex flex-wrap gap-1.5">
          {article.tags.map((tag) => (
            <span
              key={tag}
              className="text-[10px] font-mono font-bold text-[#1B4D4A] bg-[#EDF1F0] px-2.5 py-1 rounded-md border border-[#DDE3E2]"
            >
              #{tag}
            </span>
          ))}
        </div>
      </div>

      {/* Floating Action Bar */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-[#1B4D4A] text-white px-4 py-3 rounded-2xl shadow-2xl border border-[#2E7D73] flex items-center justify-between gap-4 max-w-md w-[92vw]">
        {/* Voice Play/Pause Control */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleVoiceToggle}
            className="px-4 py-2 bg-[#2E7D73] hover:bg-[#23635B] text-white font-bold text-xs rounded-xl transition cursor-pointer flex items-center gap-2 shadow-xs"
          >
            {isSpeaking ? (
              isPaused ? (
                <>
                  <Play className="w-4 h-4 text-white" />
                  <span>{currentLang === 'gu' ? 'ચાલુ કરો' : currentLang === 'hi' ? 'जारी रखें' : 'Resume Voice'}</span>
                </>
              ) : (
                <>
                  <Pause className="w-4 h-4 text-white" />
                  <span>{currentLang === 'gu' ? 'અટકાવો' : currentLang === 'hi' ? 'रोकें' : 'Pause Voice'}</span>
                </>
              )
            ) : (
              <>
                <Volume2 className="w-4 h-4 text-[#B2DFD8]" />
                <span>{currentLang === 'gu' ? 'સાંભળો (Voice)' : currentLang === 'hi' ? 'सुनें (Voice)' : 'Listen Article'}</span>
              </>
            )}
          </button>

          {isSpeaking && (
            <button
              onClick={stop}
              className="p-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl transition cursor-pointer"
              title="Stop Narration"
            >
              <VolumeX className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Share Button */}
        <button
          onClick={handleShare}
          className="px-4 py-2 bg-[#B2DFD8] hover:bg-white text-[#1B4D4A] font-bold text-xs rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-xs"
        >
          <Share2 className="w-4 h-4 text-[#1B4D4A]" />
          <span>{currentLang === 'gu' ? 'શેર કરો' : currentLang === 'hi' ? 'शेयर करें' : 'Share'}</span>
        </button>
      </div>
    </div>
  );
};
