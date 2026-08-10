import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Heart, Sparkles, Flame, Volume2, Share2, Award, ArrowLeft, Sun, ShieldCheck, CheckCircle2, BookOpen, MapPin } from 'lucide-react';
import { LanguageCode } from '../types';

interface Story {
  id: string;
  category: 'cancer' | 'child' | 'heart' | 'chronic';
  heroName: { gu: string; hi: string; en: string };
  age: number;
  village: { gu: string; hi: string; en: string };
  condition: { gu: string; hi: string; en: string };
  title: { gu: string; hi: string; en: string };
  summary: { gu: string; hi: string; en: string };
  fullStory: { gu: string; hi: string; en: string };
  victoryMantra: { gu: string; hi: string; en: string };
  keyFactors: { gu: string; hi: string; en: string }[];
  timeframe: string;
}

const INSPIRATIONAL_STORIES: Story[] = [
  {
    id: 'story-aarav-leukemia',
    category: 'child',
    heroName: {
      gu: 'આરવ પટેલ (ઉંમર ૭ વર્ષ)',
      hi: 'आरव पटेल (आयु 7 वर्ष)',
      en: 'Little Aarav Patel (Age 7)'
    },
    age: 7,
    village: {
      gu: 'મોબી નજીક વાંકાનેર ગામ, ગુજરાત',
      hi: 'वांकानेर गांव, गुजरात',
      en: 'Wankaner Village, Gujarat'
    },
    condition: {
      gu: 'બ્લડ કેન્સર (એક્યુટ લ્યુકેમિયા)',
      hi: 'ब्लड कैंसर (एक्यूट ल्यूकेमिया)',
      en: 'Blood Cancer (Acute Leukemia)'
    },
    title: {
      gu: '૭ વર્ષના નાનકડા આરવે કેન્સરને હરાવી શાળામાં પ્રથમ સ્થાન મેળવ્યું!',
      hi: '7 साल के छोटे आरव ने कैंसर को हराकर स्कूल में पहला स्थान पाया!',
      en: '7-Year-Old Aarav Defeated Blood Cancer & Came First in School!'
    },
    summary: {
      gu: 'માત્ર ૫ વર્ષની ઉંમરે વારંવાર આવતા તાવ અને કમજોરી બાદ આરવને કેન્સરનું નિદાન થયું હતું. યોગ્ય સારવાર, પરિવારનો અડગ વિશ્વાસ અને સરકારી યોજનાની મદદથી તે આજે સંપૂર્ણ સ્વસ્થ છે.',
      hi: 'केवल 5 साल की उम्र में कैंसर की पुष्टि हुई थी। समय पर रेफरल, सरकारी सहायता (पीएम-जय) और मजबूत हौसले से आरव ने कैंसर को पूरी तरह हरा दिया।',
      en: 'Diagnosed at age 5 with persistent fever and weakness. With timely referral, PM-JAY aid, and unwavering family hope, Aarav completely defeated cancer.'
    },
    fullStory: {
      gu: 'જ્યારે આરવને તાવ ઉતરતો નહોતો અને શરીરે વાદળી ડાઘ દેખાવા લાગ્યા, ત્યારે ગ્રામીણ ક્લિનિકના ડોક્ટરે તુરંત બ્લડ ટેસ્ટ કરાવી કેન્સર હોસ્પિટલમાં મોકલ્યો. પીએમ-જેએવાય યોજના હેઠળ નિઃશુલ્ક સારવાર થઈ. ૨ વર્ષની સારવાર બાદ આરવ આજે સંપૂર્ણ કેન્સર-મુક્ત (Cancer-Free) છે અને રમતમાં અને અભ્યાસમાં ચપળ છે!',
      hi: 'जब आरव का बुखार ठीक नहीं हो रहा था, तब गांव के क्लिनिक से तुरंत जांच के बाद कैंसर अस्पताल भेजा गया। पीएम-जेएवाई योजना से मुफ्त इलाज हुआ। 2 साल के इलाज के बाद आरव अब पूरी तरह स्वस्थ है और दूसरी कक्षा में पहला आया!',
      en: 'When Aarav had persistent fever and bruising, the rural clinic promptly ordered blood tests and referred him to a regional cancer institute. Under PM-JAY, his treatment was completely free. Today, after 2 years, Aarav is 100% cancer-free and leading his 2nd-grade class!'
    },
    victoryMantra: {
      gu: '"કેન્સર એ જિંદગીનો અંત નથી, પણ હિંમતથી લડવાની શરૂઆત છે!"',
      hi: '"कैंसर जिंदगी का अंत नहीं, बल्कि हिम्मत से लड़ने की शुरुआत है!"',
      en: '"Cancer is not the end of life, but the beginning of an invincible fight!"'
    },
    keyFactors: [
      { gu: 'સમયસર વહેલી ઓળખ (Early Triage)', hi: 'समय पर पहचान (Early Triage)', en: 'Early Triage & Timely Detection' },
      { gu: 'પીએમ-જેએવાય સરકારી કેન્સર યોજના મદદ', hi: 'पीएम-जय सरकारी योजना सहायता', en: 'PM-JAY Government Financial Aid' },
      { gu: 'પોષણક્ષમ આહાર અને કૌટુંબિક આશા', hi: 'पौष्टिक आहार एवं परिवार का संबल', en: 'Nutritious Diet & Family Courage' }
    ],
    timeframe: '2023 - 2025'
  },
  {
    id: 'story-anandiben-breast-cancer',
    category: 'cancer',
    heroName: {
      gu: 'બા આનંદીબેન (ઉંમર ૬૨ વર્ષ)',
      hi: 'बा आनंदीबेन (आयु 62 वर्ष)',
      en: 'Baa Anandiben (Age 62)'
    },
    age: 62,
    village: {
      gu: 'જેતપુર, રાજકોટ જિલ્લો',
      hi: 'जेतपुर, राजकोट जिला',
      en: 'Jetpur, Rajkot District'
    },
    condition: {
      gu: 'સ્ટેજ-૩ બ્રેસ્ટ કેન્સર (સ્તન કેન્સર)',
      hi: 'स्टेज-3 ब्रेस्ट कैंसर',
      en: 'Stage III Breast Cancer'
    },
    title: {
      gu: '૬૨ વર્ષના આનંદીબાએ કેન્સરને હરાવી ગામમાં મહિલા યોગ ક્લાસ શરૂ કર્યા!',
      hi: '62 साल की आनंदीबा ने कैंसर हराकर गांव में योग क्लास शुरू की!',
      en: '62-Year-Old Anandiba Defeated Stage 3 Breast Cancer & Now Teaches Village Yoga!'
    },
    summary: {
      gu: 'છાતીમાં ગાંઠ જણાયા પછી ડર્યા વગર વહેલી શસ્ત્રક્રિયા અને કીમોથેરાપી કરાવી. આજે બા ગામની દરેક મહિલાને કેન્સરથી ન ડરવા અને વહેલી તપાસ કરાવવા પ્રેરણા આપે છે.',
      hi: 'छाती में गांठ मिलने पर बिना डरे जांच कराई। सर्जरी और कीमोथेरेपी पूरी कर बा आज पूरी तरह स्वस्थ हैं और गांव की महिलाओं को जागरूक करती हैं।',
      en: 'Upon noticing a lump, Anandiba immediately got checked without fear. Completing surgery and therapy, she beat cancer and now runs daily village wellness circles.'
    },
    fullStory: {
      gu: 'આનંદીબાને શરૂઆતમાં ગામમાં કહેવામાં આવ્યું કે ઉંમર મોટી છે એટલે સારવાર અઘરી થશે. પરંતુ બાએ હિંમત ન હારી. માં અમૃતમ યોજનાથી અમદાવાદમાં સફળ સર્જરી અને સિક્યોર કીમો થયા. સાથોસાથ પ્રાણાયામ અને સાત્વિક આહાર રાખ્યો. આજે ૪ વર્ષથી બા બિલકુલ રોગમુક્ત છે!',
      hi: 'शुरुआत में डर था, लेकिन आनंदीबा ने हिम्मत नहीं हारी। मां अमृतम योजना के तहत अहमदाबाद में सफल सर्जरी हुई। साथ में प्राणायाम और सात्विक आहार अपनाया। आज 4 साल से बा पूरी तरह कैंसर-मुक्त हैं!',
      en: 'Despite initial fears, Anandiba stayed resolute. With MA Amrutam scheme coverage in Ahmedabad, she successfully underwent surgery and therapy alongside daily Pranayama and clean Ayurvedic diet. She has been completely cancer-free for 4 years!'
    },
    victoryMantra: {
      gu: '"ડરશો નહીં! કેન્સરની વહેલી તપાસ જ વિજયની ચાવી છે."',
      hi: '"डरिए मत! कैंसर की समय पर जांच ही जीत की कुंजी है।"' ,
      en: '"Do not fear! Early screening is the golden key to beating cancer completely."'
    },
    keyFactors: [
      { gu: 'ગાંઠની તુરંત તપાસ (Early Lump Screening)', hi: 'गांठ की तुरंत जांच (Early Screening)', en: 'Immediate Lump Screening' },
      { gu: 'સતત સકારાત્મક મનોબળ અને પ્રાણાયામ', hi: 'सकारात्मक सोच एवं प्राणायाम', en: 'Positive Mindset & Daily Pranayama' },
      { gu: 'આયુર્વેદિક પથ્ય પાલન', hi: 'आयुर्वेदिक पथ्य पालन', en: 'Ayurvedic Pathya Diet Principles' }
    ],
    timeframe: '2022 - Present'
  },
  {
    id: 'story-rameshbhai-cardiac-recovery',
    category: 'heart',
    heroName: {
      gu: 'રમેશભાઈ ગોહિલ (ઉંમર ૫૮ વર્ષ)',
      hi: 'रमेशभाई गोहिल (आयु 58 वर्ष)',
      en: 'Ramesh Patel (Age 58)'
    },
    age: 58,
    village: {
      gu: 'આણંદ નજીક મોગરી ગામ',
      hi: 'आनंद के पास मोगरी गांव',
      en: 'Mogri Village, Anand'
    },
    condition: {
      gu: 'ગંભીર હૃદયરોગનો હુમલો અને સ્ટેન્ટ (Severe Heart Attack)',
      hi: 'गंभीर हृदयाघात एवं स्टेंट',
      en: 'Severe Heart Attack & Emergency Stent'
    },
    title: {
      gu: 'હાર્ટ એટેક પછી દરરોજ ૫ કિમી ચાલવાની આદતથી રમેશભાઈએ નવી જિંદગી મેળવી!',
      hi: 'हार्ट अटैक के बाद रोज 5 किमी टहलकर रमेशभाई ने पाई नई जिंदगी!',
      en: 'After Severe Heart Attack, Ramesh Walked His Way Back to Full Vitality!'
    },
    summary: {
      gu: 'ખેતરમાં કામ કરતા અચાનક છાતીમાં ઉપડેલો અસહ્ય દુખાવો ક્લિનિકના સમયસર ઈસીજીથી ઓળખાયો. આજે યોગ્ય કસરત અને મીઠા-તેલના નિયંત્રણથી રમેશભાઈ તંદુરસ્ત છે.',
      hi: 'खेत में काम के दौरान छाती में तेज दर्द हुआ। समय पर ईसीजी और रेफरल से जान बची। आज संतुलित जीवनशैली से वे पूरी तरह फिट हैं।',
      en: 'Chest pain in the farm was caught on timely ECG at the rural health center. With stent placement, low-salt diet, and walking, he walks 5 km daily without fatigue.'
    },
    fullStory: {
      gu: 'રમેશભાઈ બીડી પીતા હતા અને વધુ પડતું મીઠું ખાતા હતા. હુમલા પછી તેમણે બીડી તુરંત છોડી દીધી, સવારે અર્જુન છાલનો ઉકાળો અને ૪૫ મિનિટ ચાલવાનું શરૂ કર્યું. આજે તેમનું હૃદય પંપિંગ ૫૫% થઈ ગયું છે!',
      hi: 'गंभीर दौरे के बाद रमेशभाई ने तंबाकू पूरी तरह छोड़ दी, रोज सुबह टहलना और अर्जुन छाल का काढ़ा शुरू किया। आज उनका दिल पूरी तरह स्वस्थ है!',
      en: 'Ramesh quit tobacco instantly post-attack, adopted an Arjun tea routine, and started a daily 45-minute morning walk. Today his ejection fraction is back to normal!'
    },
    victoryMantra: {
      gu: '"તંબાકુ છોડો, દરરોજ ચાલો - તમારું હૃદય વર્ષો સુધી ધબકતું રહેશે!"',
      hi: '"तंबाकू छोड़ें, रोज टहलें - आपका दिल सालों-साल धड़कता रहेगा!"',
      en: '"Quit tobacco, walk daily - your heart will beat strong for decades!"'
    },
    keyFactors: [
      { gu: 'સમયસર ઈસીજી (Emergency ECG in 10 mins)', hi: 'समय पर ईसीजी (Emergency ECG)', en: 'Timely Emergency ECG' },
      { gu: 'તંબાકુનો સંપૂર્ણ ત્યાગ', hi: 'तंबाकू का पूर्ण त्याग', en: '100% Tobacco Cessation' },
      { gu: 'દૈનિક ૪૫ મિનિટ ભ્રમણ (Walking Routine)', hi: 'प्रतिदिन 45 मिनट टहलना', en: 'Daily 45-min Brisk Walk' }
    ],
    timeframe: '2024 - Present'
  },
  {
    id: 'story-priya-dengue-recovery',
    category: 'chronic',
    heroName: {
      gu: 'પ્રિયા રાવળ (ઉંમર ૧૨ વર્ષ)',
      hi: 'प्रिया रावल (आयु 12 वर्ष)',
      en: 'Priya Raval (Age 12)'
    },
    age: 12,
    village: {
      gu: 'ડીસા, બનાસકાંઠા',
      hi: 'डीसा, बनासकांठा',
      en: 'Deesa, Banaskantha'
    },
    condition: {
      gu: 'ડેન્ગ્યુ શોક સિન્ડ્રોમ અને પ્લેટલેટ ઘટી જવા',
      hi: 'डेंगू शौक सिंड्रोम एवं प्लेटलेट्स में भारी गिरावट',
      en: 'Dengue Shock Syndrome with Critically Low Platelets'
    },
    title: {
      gu: 'ડેન્ગ્યુમાં પ્લેટલેટ ૨૦,૦૦૦ થઈ ગયા પછી પણ પ્રિયાએ હિંમતથી રિકવરી કરી ખો-ખો મેચ જીતી!',
      hi: 'डेंगू में प्लेटलेट्स 20,000 होने पर भी प्रिया ने जीती जिंदगी की जंग!',
      en: 'Priya Survived Critical Dengue Shock Syndrome & Won the School Sports Trophy!'
    },
    summary: {
      gu: 'ચોમાસામાં સતત તેજ તાવ અને બીપી ઘટી જવા છતાં સીએચસી સેન્ટરમાં આઈવી ફ્લુઈડ અને પપૈયા પાન / ગિલોયના આયુર્વેદિક સપોર્ટથી ૬ દિવસમાં પ્લેટલેટ ૧,૫૦,૦૦૦ વધી ગયા.',
      hi: 'समय पर आईवी फ्लुइड्स, गिलोय-पपीते के पत्ते के रस और देखभाल से 6 दिन में प्रिया पूरी तरह ठीक होकर स्कूल लौटी।',
      en: 'Critically ill with low BP and platelets during monsoon, intravenous fluids and papaya leaf / Giloy syrup support restored her platelets back to 150,000 in 6 days.'
    },
    fullStory: {
      gu: 'ચોમાસામાં ૧૨ વર્ષની પ્રિયાને સખત તાવ સાથે બ્લડ પ્રેશર ઘટી ગયું હતું અને પ્લેટલેટ્સ માત્ર ૨૦,૦૦૦ થઈ ગયા હતા. માતાપિતાએ ગભરાયા વગર તુરંત સીએચસી સેન્ટરમાં એડમિટ કરી. ડોક્ટરશ્રીની દેખરેખ હેઠળ આઈવી ફ્લુઈડ પ્રોટોકોલ અને ગિલોય-પપૈયા પાનના અર્કનો સપોર્ટ આપ્યો. ૬ જ દિવસમાં પ્રિયાના પ્લેટલેટ વધીને ૧,૫૦,૦૦૦ થઈ ગયા અને આજે તે પોતાની ખો-ખો ટીમની કેપ્ટન છે!',
      hi: 'बारिश के मौसम में 12 साल की प्रिया को तेज बुखार के साथ बीपी कम हो गया और प्लेटलेट्स 20,000 तक गिर गए। समय पर अस्पताल पहुंचने और आईवी तरल पदार्थों व गिलोय-पपीता रस के सेवन से 6 दिनों में प्लेटलेट्स 1,50,000 हो गए। आज प्रिया अपने स्कूल की स्पोर्ट्स स्टार है!',
      en: 'During monsoon, 12-year-old Priya suffered high fever with critically low BP and platelets dropping to 20,000. Her family promptly brought her to the CHC. Under medical care with IV fluids and herbal Giloy-papaya extract support, her platelets surged back to 150,000 in just 6 days. Today she is captain of her school sports team!'
    },
    victoryMantra: {
      gu: '"તાવમાં વિલંબ ન કરો - પ્રવાહી અને સમયસર સંભાળ જ સાચો ઉપાય છે."',
      hi: '"बुखार में देरी न करें - तरल पदार्थ और सही देखभाल ही असली इलाज है।"',
      en: '"Never ignore high fever - hydration and prompt care save lives every time."'
    },
    keyFactors: [
      { gu: 'ચોક્કસ આઈવી ફ્લુઈડ પ્રોટોકોલ (Hydration)', hi: 'सटीक हाइड्रेशन प्रोटोकॉल', en: 'Precise IV Fluid Hydration' },
      { gu: 'ગિલોય અને પપૈયા આયુર્વેદિક સહાય', hi: 'गिलोय एवं पपीता आयुर्वेदिक सहायता', en: 'Giloy & Papaya Herbal Support' },
      { gu: 'કુદરતી આરામ અને સમયસર રક્ત તપાસ', hi: 'आराम और समय पर ब्लड जांच', en: 'Rest & Continuous CBC Monitoring' }
    ],
    timeframe: 'Monsoon 2024'
  }
];

export const InspirationalStories: React.FC<{ onBackToHome?: () => void }> = ({ onBackToHome }) => {
  const { i18n } = useTranslation();
  const currentLang = (i18n.language || 'en') as LanguageCode;

  const [selectedCategory, setSelectedCategory] = useState<'all' | 'cancer' | 'child' | 'heart' | 'chronic'>('all');
  const [hopeCount, setHopeCount] = useState<number>(1284);
  const [hasLitLamp, setHasLitLamp] = useState<boolean>(false);
  const [activeStory, setActiveStory] = useState<Story | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);

  const handleLightLamp = () => {
    if (!hasLitLamp) {
      setHopeCount((prev) => prev + 1);
      setHasLitLamp(true);
    }
  };

  const handleSimulateAudio = () => {
    setIsPlayingAudio(true);
    setTimeout(() => {
      setIsPlayingAudio(false);
    }, 4000);
  };

  const filteredStories = selectedCategory === 'all'
    ? INSPIRATIONAL_STORIES
    : INSPIRATIONAL_STORIES.filter((s) => s.category === selectedCategory);

  const labels = {
    headerTitle: currentLang === 'gu'
      ? 'પ્રેરણા અને આશાની વિજય ગાથા'
      : currentLang === 'hi'
      ? 'प्रेरणा और उम्मीद की विजय गाथा'
      : 'Stories of Hope & Invincible Courage',
    headerSub: currentLang === 'gu'
      ? 'કેન્સર અને ગંભીર રોગો સામે જંગ જીતેલા અમારા ગ્રામીણ વીરોની સત્ય વાર્તાઓ'
      : currentLang === 'hi'
      ? 'कैंसर और गंभीर बीमारियों पर विजय पाने वाले ग्रामीण वीरों की सच्ची कहानियां'
      : 'Real stories of rural heroes who beat cancer and critical illnesses with bravery',
    lampText: currentLang === 'gu'
      ? 'દર્દીઓના મનોબળ માટે આશાનો દીવો પ્રગટાવો'
      : currentLang === 'hi'
      ? 'मरीजों के हौसले के लिए आशा का दीया जलाएं'
      : 'Light a Lamp of Hope for Patients',
    lampsLit: currentLang === 'gu'
      ? 'ગામવાસીઓ દ્વારા પ્રગટાવાયેલા આશાના દીવા'
      : currentLang === 'hi'
      ? 'गांव वालों द्वारा जलाए गए आशा के दीये'
      : 'Digital Lamps of Hope Lit',
    allTab: currentLang === 'gu' ? 'બધી વાર્તાઓ' : currentLang === 'hi' ? 'सभी कहानियां' : 'All Stories',
    cancerTab: currentLang === 'gu' ? 'કેન્સર વિજય' : currentLang === 'hi' ? 'कैंसर विजय' : 'Cancer Victories',
    childTab: currentLang === 'gu' ? 'બાળ વીરો' : currentLang === 'hi' ? 'बाल वीर' : 'Child Heroes',
    heartTab: currentLang === 'gu' ? 'હૃદયરોગ પરાક્રમ' : currentLang === 'hi' ? 'हृदय विजय' : 'Heart Courage',
    readFull: currentLang === 'gu' ? 'સંપૂર્ણ ગાથા વાંચો' : currentLang === 'hi' ? 'पूरी कहानी पढ़ें' : 'Read Full Journey',
    listenAudio: currentLang === 'gu' ? 'વાર્તા સાંભળો (Audio)' : currentLang === 'hi' ? 'कहानी सुनें (Audio)' : 'Listen Story (Audio)',
    playing: currentLang === 'gu' ? 'વાર્તા વંચાઈ રહી છે...' : currentLang === 'hi' ? 'कहानी पढ़ी जा रही है...' : 'Narrating story...',
    keyFactorsTitle: currentLang === 'gu' ? 'વિજયના મુખ્ય સ્તંભો (Winning Factors):' : currentLang === 'hi' ? 'जीत के मुख्य आधार:' : 'Key Pillars of Victory:',
    closeModal: currentLang === 'gu' ? 'બંધ કરો' : currentLang === 'hi' ? 'बंद करें' : 'Close Story'
  };

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-4 py-6 space-y-6 bg-[#F4F7F6] min-h-[calc(100vh-80px)] font-sans">
      {/* Top Header Banner */}
      <div className="bg-[#1B4D4A] text-white rounded-2xl p-6 shadow-card border border-[#2E7D73]/30 relative font-sans">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-lg bg-[#2E7D73]/50 text-[#B2DFD8] border border-[#B2DFD8]/20 text-[10px] font-mono font-bold uppercase tracking-wider">
              <Award className="w-3.5 h-3.5 text-white" />
              <span>CLINICAL TRIUMPH & CASE RECOVERY</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight font-display">
              {labels.headerTitle}
            </h1>
            <p className="text-xs sm:text-sm font-sans text-[#B2DFD8] leading-relaxed">
              {labels.headerSub}
            </p>
          </div>

          {/* Light a Lamp of Hope Interactive Box */}
          <div className="bg-[#2E7D73] p-4 rounded-2xl border border-[#B2DFD8]/20 text-center space-y-2 shrink-0 font-sans shadow-xs">
            <div className="flex items-center justify-center gap-2 text-white">
              <Flame className={`w-6 h-6 ${hasLitLamp ? 'text-[#B2DFD8]' : 'text-white/60'}`} />
              <span className="text-2xl font-black font-display">{hopeCount}</span>
            </div>
            <p className="text-[10px] text-[#B2DFD8] max-w-[180px] mx-auto leading-tight">
              {labels.lampsLit}
            </p>
            <button
              onClick={handleLightLamp}
              disabled={hasLitLamp}
              className={`w-full py-2 px-3 rounded-xl font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 ${
                hasLitLamp
                  ? 'bg-[#1B4D4A] text-[#B2DFD8]'
                  : 'bg-white text-[#1B4D4A] hover:bg-[#F4F7F6] active:scale-95 shadow-xs'
              }`}
            >
              <Sun className="w-4 h-4 text-[#1B4D4A]" />
              <span>{hasLitLamp ? 'LAMP LIT' : labels.lampText}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 font-sans text-xs">
        {[
          { key: 'all', label: labels.allTab },
          { key: 'cancer', label: labels.cancerTab },
          { key: 'child', label: labels.childTab },
          { key: 'heart', label: labels.heartTab }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setSelectedCategory(tab.key as any)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
              selectedCategory === tab.key
                ? 'bg-[#2E7D73] text-white shadow-xs'
                : 'bg-white text-[#1A2B2B] border border-[#DDE3E2] hover:bg-[#EDF1F0]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Stories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 font-sans">
        {filteredStories.map((story) => (
          <div
            key={story.id}
            className="bg-white rounded-2xl p-5 border border-[#DDE3E2] shadow-card hover:border-[#2E7D73] transition flex flex-col justify-between space-y-4 relative"
          >
            {/* Tag & Location */}
            <div className="flex items-center justify-between border-b border-[#DDE3E2] pb-3">
              <span className="px-2.5 py-0.5 rounded-lg bg-[#2E7D73] text-white text-[10px] font-bold uppercase tracking-wider">
                {story.category === 'cancer' && 'Cancer Victory'}
                {story.category === 'child' && 'Child Hero'}
                {story.category === 'heart' && 'Heart Fighter'}
                {story.category === 'chronic' && 'Disease Recovery'}
              </span>

              <span className="text-[11px] font-bold text-[#5F6D6C] inline-flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-[#2E7D73]" />
                <span>{story.village[currentLang] || story.village.en}</span>
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-[#2E7D73] shrink-0" />
                <h3 className="font-extrabold text-base sm:text-lg text-[#1B4D4A] leading-snug font-display">
                  {story.heroName[currentLang] || story.heroName.en}
                </h3>
              </div>

              <div className="bg-[#EDF1F0] p-2 rounded-xl border border-[#DDE3E2] text-xs text-[#1B4D4A]">
                DIAGNOSIS: <span className="font-bold">{story.condition[currentLang] || story.condition.en}</span>
              </div>

              <h4 className="font-bold text-sm sm:text-base text-[#1A2B2B] leading-snug pt-1 font-display">
                "{story.title[currentLang] || story.title.en}"
              </h4>

              <p className="text-xs sm:text-sm font-sans font-medium text-[#5F6D6C] leading-relaxed">
                {story.summary[currentLang] || story.summary.en}
              </p>
            </div>

            {/* Quote Box */}
            <div className="bg-[#F4F7F6] p-3 rounded-xl border border-[#DDE3E2] text-xs font-bold text-[#1B4D4A] italic font-sans">
              {story.victoryMantra[currentLang] || story.victoryMantra.en}
            </div>

            {/* Bottom Actions */}
            <div className="pt-2 flex items-center justify-between gap-2 border-t border-[#DDE3E2] font-sans">
              <button
                onClick={() => handleSimulateAudio()}
                className="p-2.5 rounded-xl bg-[#EDF1F0] hover:bg-[#DDE3E2] text-[#1B4D4A] text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                title={labels.listenAudio}
              >
                <Volume2 className={`w-4 h-4 text-[#2E7D73] ${isPlayingAudio ? 'animate-bounce' : ''}`} />
                <span className="hidden sm:inline">{isPlayingAudio ? labels.playing : labels.listenAudio}</span>
              </button>

              <button
                onClick={() => setActiveStory(story)}
                className="px-4 py-2.5 bg-[#1B4D4A] hover:bg-[#2E7D73] text-white font-bold text-xs rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-xs"
              >
                <BookOpen className="w-4 h-4 text-white" />
                <span>{labels.readFull}</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Detailed Story Modal */}
      {activeStory && (
        <div className="fixed inset-0 bg-[#1A2B2B]/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto border border-[#DDE3E2] p-6 space-y-5 font-sans">
            <div className="flex items-center justify-between border-b border-[#DDE3E2] pb-3">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-[#2E7D73]" />
                <h3 className="font-bold text-lg text-[#1B4D4A] font-display">
                  {activeStory.heroName[currentLang] || activeStory.heroName.en}
                </h3>
              </div>
              <button
                onClick={() => setActiveStory(null)}
                className="p-1.5 rounded-xl bg-[#EDF1F0] text-[#1B4D4A] hover:bg-[#DDE3E2] transition cursor-pointer font-bold text-xs px-3"
              >
                {labels.closeModal}
              </button>
            </div>

            <div className="space-y-4 font-sans">
              <div className="p-3 bg-[#EDF1F0] rounded-xl border border-[#DDE3E2] text-xs text-[#1B4D4A]">
                <strong>DIAGNOSIS:</strong> {activeStory.condition[currentLang] || activeStory.condition.en} • <strong>LOCATION:</strong> {activeStory.village[currentLang] || activeStory.village.en} ({activeStory.timeframe})
              </div>

              <h4 className="font-extrabold text-base sm:text-lg text-[#1B4D4A] leading-snug font-display">
                {activeStory.title[currentLang] || activeStory.title.en}
              </h4>

              <p className="text-sm font-medium text-[#1A2B2B] leading-relaxed bg-[#F4F7F6] p-4 rounded-xl border border-[#DDE3E2]">
                {activeStory.fullStory[currentLang] || activeStory.fullStory.en}
              </p>

              <div className="bg-[#EDF1F0] p-4 rounded-xl border border-[#DDE3E2] text-center text-sm font-bold text-[#1B4D4A] italic font-sans">
                "{activeStory.victoryMantra[currentLang] || activeStory.victoryMantra.en}"
              </div>

              {/* Key Factors */}
              <div className="space-y-2 font-sans">
                <h5 className="font-bold text-xs text-[#1B4D4A] uppercase tracking-wider font-display">
                  {labels.keyFactorsTitle}
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {activeStory.keyFactors.map((factor, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-[#F4F7F6] rounded-xl border border-[#DDE3E2] text-xs font-bold text-[#1A2B2B] flex items-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4 text-[#2E7D73] shrink-0" />
                      <span>{factor[currentLang] || factor.en}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end font-sans">
              <button
                onClick={() => setActiveStory(null)}
                className="w-full sm:w-auto px-6 py-2.5 bg-[#1B4D4A] hover:bg-[#2E7D73] text-white font-bold text-sm rounded-xl transition cursor-pointer shadow-xs"
              >
                {labels.closeModal}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
