import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { BookOpen, Search, CheckSquare, Sparkles, ChevronRight, Droplets, Activity, Shield, Apple, Sun, Coffee } from 'lucide-react';
import { LanguageCode } from '../types';
import healthArticlesData from '../data/health_articles.json';
import { ArticleDetail, FullArticle } from './ArticleDetail';

export const HealthArticles: React.FC<{ onBackToHome?: () => void }> = ({ onBackToHome }) => {
  const { i18n } = useTranslation();
  const currentLang = (i18n.language || 'en') as LanguageCode;

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedArticle, setSelectedArticle] = useState<FullArticle | null>(null);

  // Daily Habits State (Locally saved check marks)
  const [habits, setHabits] = useState<{ [key: string]: boolean }>({
    water: false,
    walk: false,
    noTobacco: true,
    fruit: false,
    pranayama: false,
    earlyDinner: false,
  });

  const toggleHabit = (key: string) => {
    setHabits((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const completedCount = Object.values(habits).filter(Boolean).length;
  const totalHabits = Object.keys(habits).length;
  const healthScore = Math.round((completedCount / totalHabits) * 100);

  const categories = [
    { id: 'all', label: { en: 'All Articles', hi: 'सभी लेख', gu: 'તમામ લેખો' } },
    { id: 'child_health', label: { en: 'Child Health', hi: 'बाल स्वास्थ्य', gu: 'બાળ આરોગ્ય' } },
    { id: 'hygiene', label: { en: 'Hygiene & Water', hi: 'स्वच्छता व जल', gu: 'સ્વચ્છતા અને જળ' } },
    { id: 'nutrition', label: { en: 'Nutrition', hi: 'पोषण', gu: 'પોષણ' } },
    { id: 'disease_prevention', label: { en: 'Disease Prevention', hi: 'बीमारी रोकथाम', gu: 'રોગ અટકાવ' } },
    { id: 'maternal_health', label: { en: 'Maternal Health', hi: 'માતાનું આરોગ્ય', gu: 'માતાનું આરોગ્ય' } },
    { id: 'chronic_care', label: { en: 'Chronic Care', hi: 'दीर्घकालिक देखभाल', gu: 'દીર્ઘકાલીન સંભાળ' } },
  ];

  const articlesList = healthArticlesData as FullArticle[];

  const filteredArticles = useMemo(() => {
    return articlesList.filter((art) => {
      // Category match
      if (selectedCategory !== 'all' && art.category !== selectedCategory) {
        return false;
      }

      // Search match
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();

      const titleMatch = (art.title[currentLang] || art.title.en).toLowerCase().includes(q);
      const tagMatch = art.tags.some((t) => t.toLowerCase().includes(q));

      const bodyMatch = art.body.some((b) => {
        if (b.type === 'text' && b.content) {
          return (b.content[currentLang] || b.content.en).toLowerCase().includes(q);
        }
        return false;
      });

      return titleMatch || tagMatch || bodyMatch;
    });
  }, [articlesList, selectedCategory, searchQuery, currentLang]);

  const labels = {
    title: currentLang === 'gu'
      ? 'નિરોગી આરોગ્ય શિક્ષણ લાઇબ્રેરી'
      : currentLang === 'hi'
      ? 'निरोगी स्वास्थ्य शिक्षा पुस्तकालय'
      : 'Nirāmay Offline Health Education Library',
    sub: currentLang === 'gu'
      ? 'ORS, હાથ ધોવા, નવજાત સંભાળ, ટીબી અને રોગચાળા અટકાવવા અંગે મફત ઑફલાઇન માર્ગદર્શિકા'
      : currentLang === 'hi'
      ? 'ORS, हाथ धोना, नवजात देखभाल, टीबी और बीमारी बचाव पर मुफ्त ऑफ़लाइन गाइड'
      : 'Illustrated, voice-narrated guide for essential rural health & disease prevention',
    searchPlaceholder: currentLang === 'gu'
      ? 'લેખ અથવા ટેગ શોધો (દા.ત. ORS, રસી, તાવ)...'
      : currentLang === 'hi'
      ? 'लेख या टैग खोजें (जैसे ORS, टीका, बुखार)...'
      : 'Search articles or tags (e.g., ORS, vaccine, fever)...',
    habitsTitle: currentLang === 'gu' ? 'આજની સ્વસ્થ દિનચર્યા ચેકલિસ્ટ' : currentLang === 'hi' ? 'आज की स्वस्थ दिनचर्या चेकलिस्ट' : "Today's Healthy Habits Checklist",
    habitsSub: currentLang === 'gu' ? '૬ સોનેરી આદતો પૂર્ણ કરી તમારો હેલ્થ સ્કોર વધારો' : currentLang === 'hi' ? '6 आदतें पूरी कर हेल्थ स्कोर बढ़ाएं' : 'Tick off today\'s 6 golden health habits',
    readArticle: currentLang === 'gu' ? 'વાંચો' : currentLang === 'hi' ? 'पढ़ें' : 'Read Article',
    noArticles: currentLang === 'gu' ? 'કોઈ લેખ મળ્યો નથી' : currentLang === 'hi' ? 'कोई लेख नहीं मिला' : 'No articles found matching your query.',
  };

  const habitItems = [
    { key: 'water', label: currentLang === 'gu' ? '૮-૧૦ ગ્લાસ નવશેકું પાણી' : currentLang === 'hi' ? '8-10 ग्लास गुनगुना पानी' : '8-10 Glasses Warm Water', iconComponent: <Droplets className="w-5 h-5 text-sky-600 shrink-0" /> },
    { key: 'walk', label: currentLang === 'gu' ? '૩૦ મિનિટ ભ્રમણ / વ્યાયામ' : currentLang === 'hi' ? '30 मिनट टहलना / व्यायाम' : '30 Mins Walk or Exercise', iconComponent: <Activity className="w-5 h-5 text-emerald-600 shrink-0" /> },
    { key: 'noTobacco', label: currentLang === 'gu' ? 'તંબાકુ / ગુટખા મુક્ત દિવસ' : currentLang === 'hi' ? 'तंबाकू / गुटखा मुक्त दिन' : 'Zero Tobacco Today', iconComponent: <Shield className="w-5 h-5 text-teal-600 shrink-0" /> },
    { key: 'fruit', label: currentLang === 'gu' ? '૧ તાજું મોસમી ફળ કે શાકભાજી' : currentLang === 'hi' ? '1 ताजा मौसमी फल या सब्जी' : '1 Fresh Fruit or Green Veggie', iconComponent: <Apple className="w-5 h-5 text-emerald-600 shrink-0" /> },
    { key: 'pranayama', label: currentLang === 'gu' ? '૫ મિનિટ પ્રાણાયામ' : currentLang === 'hi' ? '5 मिनट प्राणायाम' : '5 Mins Deep Breathing', iconComponent: <Sun className="w-5 h-5 text-amber-500 shrink-0" /> },
    { key: 'earlyDinner', label: currentLang === 'gu' ? 'રાત્રે ૮ વાગ્યા પહેલાં હળવું ભોજન' : currentLang === 'hi' ? 'रात 8 बजे से पहले हल्का भोजन' : 'Light Dinner Before 8 PM', iconComponent: <Coffee className="w-5 h-5 text-teal-600 shrink-0" /> },
  ];

  if (selectedArticle) {
    return (
      <ArticleDetail
        article={selectedArticle}
        onBack={() => setSelectedArticle(null)}
      />
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-4 py-6 space-y-6 bg-[#F4F7F6] min-h-[calc(100vh-80px)] font-sans">
      {/* Header Banner */}
      <div className="bg-[#1B4D4A] text-white rounded-2xl p-6 shadow-card border border-[#2E7D73]/30 space-y-2 font-sans">
        <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-lg bg-[#2E7D73]/50 text-[#B2DFD8] border border-[#B2DFD8]/20 text-[10px] font-mono font-bold uppercase tracking-wider">
          <BookOpen className="w-3.5 h-3.5 text-white" />
          <span>OFFLINE HEALTH LIBRARY</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight font-display">
          {labels.title}
        </h1>
        <p className="text-xs sm:text-sm font-sans text-[#B2DFD8] leading-relaxed max-w-2xl">
          {labels.sub}
        </p>
      </div>

      {/* Glass-style Search Bar */}
      <div className="relative">
        <Search className="w-5 h-5 text-[#2E7D73] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={labels.searchPlaceholder}
          className="w-full pl-12 pr-4 py-3.5 bg-white/90 backdrop-blur-md rounded-2xl border border-[#DDE3E2] text-sm text-[#1A2B2B] placeholder-[#5F6D6C] focus:outline-none focus:border-[#1B4D4A] focus:ring-2 focus:ring-[#1B4D4A]/10 transition shadow-xs"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-[#5F6D6C] hover:text-[#1B4D4A]"
          >
            Clear
          </button>
        )}
      </div>

      {/* Horizontal Scrollable Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {categories.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer border ${
                isSelected
                  ? 'bg-[#1B4D4A] text-white border-[#1B4D4A] shadow-xs'
                  : 'bg-white text-[#1A2B2B] border-[#DDE3E2] hover:bg-[#EDF1F0]'
              }`}
            >
              {cat.label[currentLang] || cat.label.en}
            </button>
          );
        })}
      </div>

      {/* Articles Grid */}
      <div className="space-y-4">
        {filteredArticles.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-[#DDE3E2] space-y-2">
            <BookOpen className="w-10 h-10 text-[#5F6D6C] mx-auto opacity-40" />
            <p className="text-sm font-bold text-[#5F6D6C]">{labels.noArticles}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredArticles.map((art) => {
              // Find preview paragraph
              const previewPara = art.body.find((b) => b.type === 'text' && b.content);
              const previewText = previewPara?.content
                ? (previewPara.content[currentLang] || previewPara.content.en)
                : '';

              const titleText = art.title[currentLang] || art.title.en;

              return (
                <div
                  key={art.id}
                  onClick={() => setSelectedArticle(art)}
                  className="bg-white rounded-2xl p-5 border border-[#DDE3E2] shadow-card hover:border-[#1B4D4A] transition flex flex-col justify-between space-y-3 cursor-pointer group"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <span className="px-2.5 py-0.5 rounded-md bg-[#EDF1F0] text-[#1B4D4A] border border-[#DDE3E2]">
                        {art.category.replace('_', ' ').toUpperCase()}
                      </span>
                      <span className="text-[#5F6D6C] flex items-center gap-1 font-mono">
                        <BookOpen className="w-3.5 h-3.5 text-[#2E7D73]" />
                        2 min read
                      </span>
                    </div>

                    <h3 className="font-bold text-base text-[#1A2B2B] group-hover:text-[#1B4D4A] transition leading-snug font-display">
                      {titleText}
                    </h3>

                    <p className="text-xs text-[#5F6D6C] line-clamp-2 leading-relaxed">
                      {previewText}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-[#DDE3E2] flex items-center justify-between">
                    <div className="flex flex-wrap gap-1">
                      {art.tags.slice(0, 2).map((t) => (
                        <span key={t} className="text-[9px] font-mono font-bold text-[#2E7D73] bg-[#E0F2F1] px-1.5 py-0.5 rounded">
                          #{t}
                        </span>
                      ))}
                    </div>

                    <span className="text-xs font-bold text-[#1B4D4A] flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                      {labels.readArticle}
                      <ChevronRight className="w-4 h-4 text-[#2E7D73]" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* DAILY HABITS CHECKLIST CARD */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-[#DDE3E2] shadow-card space-y-4 font-sans mt-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#DDE3E2] pb-3">
          <div>
            <h2 className="font-bold text-base sm:text-lg text-[#1B4D4A] flex items-center gap-2 font-display">
              <CheckSquare className="w-5 h-5 text-[#2E7D73]" />
              <span>{labels.habitsTitle}</span>
            </h2>
            <p className="text-xs font-sans text-[#5F6D6C] mt-0.5">
              {labels.habitsSub}
            </p>
          </div>

          <div className="bg-[#EDF1F0] px-4 py-2 rounded-xl border border-[#DDE3E2] text-center shrink-0 font-sans">
            <div className="text-xs font-bold text-[#1B4D4A]">
              HEALTH SCORE: <span className="text-lg text-[#1B4D4A] font-black font-display">{healthScore}%</span>
            </div>
            <div className="w-24 bg-[#DDE3E2] h-2 rounded-full mt-1 overflow-hidden">
              <div className="bg-[#2E7D73] h-full transition-all duration-500" style={{ width: `${healthScore}%` }} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 font-sans">
          {habitItems.map((item) => {
            const isDone = habits[item.key];
            return (
              <button
                key={item.key}
                onClick={() => toggleHabit(item.key)}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2 ${
                  isDone
                    ? 'bg-[#1B4D4A] text-white border-[#1B4D4A] shadow-xs'
                    : 'bg-[#F4F7F6] border-[#DDE3E2] text-[#1A2B2B] hover:bg-[#EDF1F0]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-xs sm:text-sm font-bold leading-tight">{item.label}</span>
                </div>
                <div className={`w-6 h-6 rounded-lg border flex items-center justify-center shrink-0 text-xs font-bold ${
                  isDone ? 'bg-white text-[#1B4D4A] border-white' : 'border-[#DDE3E2] bg-white text-transparent'
                }`}>
                  {isDone ? '✓' : ''}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
