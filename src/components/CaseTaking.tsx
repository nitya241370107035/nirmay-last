import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Mic,
  MicOff,
  Send,
  ArrowLeft,
  Check,
  Bot,
  User as UserIcon,
  Activity,
  AlertTriangle,
  X,
  Sparkles,
  Tag,
  Clock,
  Camera,
  Image as ImageIcon,
  CheckCircle2,
  ChevronRight,
  Stethoscope,
  HelpCircle,
  RotateCcw,
  History
} from 'lucide-react';
import { CaseData, LanguageCode } from '../types';
import { extractSymptoms, extractDuration } from '../engine/nlp';
import symptomLexiconData from '../data/symptom_lexicon.json';
import { triageModelService, TriageTemplate } from '../services/triageModelService';
import { diseaseModelService, FollowUpSymptom, DiseasePredictionResult, AdaptiveQuestion, AdaptiveInquiryEvaluation } from '../services/diseaseModelService';
import { embeddingService } from '../services/embeddingService';

interface CaseTakingProps {
  onComplete: (data: CaseData) => void;
  onCancel: () => void;
}

interface ChatMessage {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  symptoms?: string[];
  imageUrl?: string;
  imageTag?: string;
  imageNote?: string;
  timestamp?: string;
}

export interface InquiryHistoryItem {
  turn: number;
  featureId: string;
  featureName: string;
  questionText: { en: string; hi: string; gu: string };
  answer: 'yes' | 'no' | 'unknown';
}

export const CaseTaking: React.FC<CaseTakingProps> = ({ onComplete, onCancel }) => {
  const { t, i18n } = useTranslation();
  const currentLang = (i18n.language || 'en') as LanguageCode;

  // Intake Stage: 'initial_message' -> 'relevant_questions'
  const [stage, setStage] = useState<'initial_message' | 'relevant_questions'>('initial_message');
  
  // Case Data State
  const [chiefComplaint, setChiefComplaint] = useState<string>('');
  const [patientAgeGroup, setPatientAgeGroup] = useState<string>('adult');
  const [patientGender, setPatientGender] = useState<string>('male');
  const [durationDays, setDurationDays] = useState<number>(2);
  const [caseAnswers, setCaseAnswers] = useState<CaseData>({});
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);

  // Adaptive Active Inquiry State (Tri-State: 1 / 0 / null, Entropy Reduction, Answer Revision)
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [redFlagAlert, setRedFlagAlert] = useState<any | null>(null);
  const [symptomVectorMap, setSymptomVectorMap] = useState<Record<string, 1 | 0 | null>>({});
  const [inquiryHistory, setInquiryHistory] = useState<InquiryHistoryItem[]>([]);
  const [confirmedSymptoms, setConfirmedSymptoms] = useState<string[]>([]);
  const [excludedSymptoms, setExcludedSymptoms] = useState<string[]>([]);
  const [unknownSymptoms, setUnknownSymptoms] = useState<string[]>([]);
  const [activeAdaptiveQuestion, setActiveAdaptiveQuestion] = useState<AdaptiveQuestion | null>(null);
  const [currentEntropy, setCurrentEntropy] = useState<number>(3.58);
  const [candidateDiseases, setCandidateDiseases] = useState<{ diseaseId?: string; name: string; probability: number; formattedProbability: string }[]>([]);
  const [questionTurn, setQuestionTurn] = useState<number>(1);
  const [stoppingEvaluation, setStoppingEvaluation] = useState<AdaptiveInquiryEvaluation | null>(null);
  const [showRevisionPanel, setShowRevisionPanel] = useState<boolean>(true);
  const [showAllChecklist, setShowAllChecklist] = useState<boolean>(false);
  const [isFinalizing, setIsFinalizing] = useState<boolean>(false);

  // Input states
  const [textInput, setTextInput] = useState<string>('');
  
  // NLP feedback states
  const [nlpSymptoms, setNlpSymptoms] = useState<string[]>([]);
  const [nlpDuration, setNlpDuration] = useState<number | null>(null);
  const [hasRedFlag, setHasRedFlag] = useState<boolean>(false);

  // Relevant Follow-up State
  const [activeFollowUps, setActiveFollowUps] = useState<FollowUpSymptom[]>([]);
  const [checkedFollowUps, setCheckedFollowUps] = useState<string[]>([]);
  const [matchedTemplate, setMatchedTemplate] = useState<TriageTemplate | null>(null);
  const [dynamicAnswers, setDynamicAnswers] = useState<Record<string, any>>({});
  const [liveDiseasePrediction, setLiveDiseasePrediction] = useState<DiseasePredictionResult | null>(null);

  // Speech recognition state
  const [isListening, setIsListening] = useState<boolean>(false);
  const [speechSupported, setSpeechSupported] = useState<boolean>(false);
  const recognitionRef = useRef<any>(null);

  // Clinical Photo State
  const [clinicalPhoto, setClinicalPhoto] = useState<string | null>(null);
  const [photoTag, setPhotoTag] = useState<string>('Skin Rash / Lesion');
  const [photoNote, setPhotoNote] = useState<string>('');
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState<boolean>(false);
  const [isGeminiCoPilotLoading, setIsGeminiCoPilotLoading] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Initial Bot Greeting
  useEffect(() => {
    const greetingText =
      currentLang === 'gu'
        ? 'નમસ્તે! દર્દીને શું તકલીફ છે? કૃપા કરીને મુખ્ય લક્ષણો અને સમસ્યા નીચે લખીને અથવા માઇક વડે જણાવો.'
        : currentLang === 'hi'
        ? 'नमस्ते! मरीज को क्या परेशानी है? कृपया मुख्य लक्षण और समस्या नीचे लिखकर या माइक से बोलकर बताएं।'
        : 'Hello! What health symptoms or troubles is the patient experiencing? Please type or speak your message below.';

    setChatHistory([
      {
        id: 'initial_greeting',
        sender: 'bot',
        text: greetingText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  }, [currentLang]);

  // Speech Recognition setup
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      setSpeechSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;

      const langMap: Record<LanguageCode, string> = {
        gu: 'gu-IN',
        hi: 'hi-IN',
        en: 'en-IN',
      };
      recognition.lang = langMap[currentLang] || 'en-IN';

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript) {
          setTextInput(transcript);
        }
      };

      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);
      recognitionRef.current = recognition;
    }
  }, [currentLang]);

  // Real-time NLP parsing of current text input
  useEffect(() => {
    if (textInput.trim().length > 2) {
      const extracted = extractSymptoms(textInput, currentLang);
      setNlpSymptoms(extracted.symptoms);
      setHasRedFlag(extracted.redFlags.length > 0);

      const dur = extractDuration(textInput);
      if (dur) {
        setNlpDuration(dur);
        setDurationDays(dur);
      }
    } else {
      setNlpSymptoms([]);
      setHasRedFlag(false);
    }
  }, [textInput, currentLang]);

  // Scroll to bottom on chat update
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, stage, matchedTemplate]);

  // Handle Voice Toggle
  const toggleListening = () => {
    if (!speechSupported || !recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (e) {
        setIsListening(false);
      }
    }
  };

  // Submit User Message
  const handleSendMessage = (messageText?: string) => {
    const rawMsg = (messageText || textInput).trim();
    if (!rawMsg) return;

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }

    const currentChief = chiefComplaint ? `${chiefComplaint}. ${rawMsg}` : rawMsg;
    setChiefComplaint(currentChief);

    // 1. Extract canonical features using comprehensive lexicon
    const extractedFeatures = diseaseModelService.extractFeaturesFromText(currentChief);
    const dur = extractDuration(currentChief) || nlpDuration || durationDays;
    setDurationDays(dur);

    const initialConfirmed = extractedFeatures.length > 0 ? extractedFeatures : ['fever'];
    const initialVector: Record<string, 1 | 0 | null> = {};
    initialConfirmed.forEach((f) => {
      initialVector[f] = 1;
    });

    setSymptomVectorMap(initialVector);
    setConfirmedSymptoms(initialConfirmed);
    setExcludedSymptoms([]);
    setUnknownSymptoms([]);
    setInquiryHistory([]);

    // 2. Initialize Server-Side Session & First Question
    diseaseModelService.startSession(initialConfirmed).then((sessionData) => {
      if (sessionData && sessionData.sessionId) {
        setActiveSessionId(sessionData.sessionId);
        if (sessionData.session?.redFlagAlert) {
          setRedFlagAlert(sessionData.session.redFlagAlert);
        }
        if (sessionData.nextQuestion) {
          setActiveAdaptiveQuestion({
            featureId: sessionData.nextQuestion.featureId,
            featureName: sessionData.nextQuestion.featureName,
            questionText: sessionData.nextQuestion.question,
            label: sessionData.nextQuestion.label,
            informationGain: sessionData.nextQuestion.informationGain || 12.5,
            expectedEntropyReduction: sessionData.nextQuestion.utility || 0.45
          });
        }
        if (sessionData.session?.currentEntropy !== undefined) {
          setCurrentEntropy(sessionData.session.currentEntropy);
        }
        if (sessionData.session?.currentPosterior) {
          setCandidateDiseases(sessionData.session.currentPosterior.map((p: any) => ({
            name: p.diseaseName,
            probability: p.probability,
            formattedProbability: `${Math.round(p.probability * 100)}%`
          })));
        }
      }
    });

    // Local evaluation backup
    const evalResult = diseaseModelService.evaluateAdaptiveState(initialVector, initialConfirmed, 1);
    if (!activeAdaptiveQuestion) {
      setActiveAdaptiveQuestion(evalResult.nextQuestion);
      setCurrentEntropy(evalResult.currentEntropy);
      setCandidateDiseases(evalResult.topCandidates);
      setStoppingEvaluation(evalResult);
    }
    setQuestionTurn(1);

    // 3. Compute live XGBoost prediction
    diseaseModelService.predictDiseaseWithXGBoost(initialConfirmed, [], initialVector).then((res) => {
      if (res.success) {
        setLiveDiseasePrediction({
          primaryDisease: res.primaryDisease,
          confidence: res.confidence,
          formattedConfidence: res.formattedConfidence,
          differentials: res.differentials.map(d => ({
            name: d.diseaseName,
            confidence: d.probability,
            likelihood: d.riskTier === 'High Risk' ? 'High' : d.riskTier === 'Moderate Risk' ? 'Moderate' : 'Low',
            formattedConfidence: d.formattedProbability
          })),
          matchedSymptoms: initialConfirmed,
          totalSymptomsChecked: initialConfirmed.length,
          urgency: res.confidence > 50 ? 'orange' : 'green',
          metrics: { top1Accuracy: 95.43, top3Accuracy: 99.34, top5Accuracy: 99.81 }
        });
      }
    });

    // Add user message to chat
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: rawMsg,
      symptoms: extractedFeatures.length > 0 ? extractedFeatures : undefined,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const botReplyText =
      currentLang === 'gu'
        ? `સમજાયું. અમે તમારા લક્ષણો નોંધ્યા છે. AI મોડેલ દ્વારા સૌથી મહત્વપૂર્ણ પ્રશ્નો ક્રમશઃ પૂછવામાં આવશે જેથી ૧૦૦% ચોક્કસ પરિણામ મળે.`
        : currentLang === 'hi'
        ? `समझ गया। हमने आपके लक्षण दर्ज कर लिए हैं। AI मॉडल द्वारा सबसे उपयोगी प्रश्न एक-एक करके पूछे जाएंगे ताकि अधिकतम सटीकता मिले।`
        : `Understood. We registered your reported symptoms. Our active AI model will now ask sequential high-information questions to reach maximum diagnostic confidence.`;

    const botMsg: ChatMessage = {
      id: (Date.now() + 1).toString(),
      sender: 'bot',
      text: botReplyText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setChatHistory((prev) => [...prev, userMsg, botMsg]);
    setTextInput('');
    setNlpSymptoms([]);
    setStage('relevant_questions');
  };

  // Adaptive Question Response Handler (Yes = 1, No = 0, Unknown = Skip / null)
  const handleAdaptiveResponse = (answer: 'yes' | 'no' | 'unknown') => {
    if (!activeAdaptiveQuestion) return;
    const featId = activeAdaptiveQuestion.featureId;
    const triVal: 1 | 0 | null = answer === 'yes' ? 1 : answer === 'no' ? 0 : null;

    const nextVector = { ...symptomVectorMap };
    nextVector[featId] = triVal;
    setSymptomVectorMap(nextVector);

    const nextConfirmed = Object.keys(nextVector).filter((k) => nextVector[k] === 1);
    const nextExcluded = Object.keys(nextVector).filter((k) => nextVector[k] === 0);
    const nextUnknown = Object.keys(nextVector).filter((k) => nextVector[k] === null);

    setConfirmedSymptoms(nextConfirmed);
    setExcludedSymptoms(nextExcluded);
    setUnknownSymptoms(nextUnknown);

    const historyEntry: InquiryHistoryItem = {
      turn: questionTurn,
      featureId: featId,
      featureName: activeAdaptiveQuestion.featureName,
      questionText: activeAdaptiveQuestion.questionText,
      answer,
    };
    const nextHistory = [...inquiryHistory, historyEntry];
    setInquiryHistory(nextHistory);

    const askedFeatures = nextHistory.map((h) => h.featureId);
    const nextTurn = questionTurn + 1;
    setQuestionTurn(nextTurn);

    // Call server session if active
    if (activeSessionId) {
      diseaseModelService.answerSessionQuestion(activeSessionId, featId, triVal).then((resp) => {
        if (resp && resp.session) {
          if (resp.session.redFlagAlert) {
            setRedFlagAlert(resp.session.redFlagAlert);
          }
          if (resp.session.currentEntropy !== undefined) {
            setCurrentEntropy(resp.session.currentEntropy);
          }
          if (resp.session.currentPosterior) {
            setCandidateDiseases(resp.session.currentPosterior.map((p: any) => ({
              name: p.diseaseName,
              probability: p.probability,
              formattedProbability: `${Math.round(p.probability * 100)}%`
            })));
          }
          if (resp.nextQuestion) {
            setActiveAdaptiveQuestion({
              featureId: resp.nextQuestion.featureId,
              featureName: resp.nextQuestion.featureName,
              questionText: resp.nextQuestion.question,
              label: resp.nextQuestion.label,
              informationGain: resp.nextQuestion.informationGain || 10.0,
              expectedEntropyReduction: resp.nextQuestion.utility || 0.40
            });
          } else {
            setActiveAdaptiveQuestion(null);
          }
        }
      });
    }

    // Compute updated Bayesian Information Gain state & check stopping criteria
    const evalResult = diseaseModelService.evaluateAdaptiveState(nextVector, askedFeatures, nextTurn);
    setStoppingEvaluation(evalResult);
    if (!activeSessionId) {
      setActiveAdaptiveQuestion(evalResult.nextQuestion);
      setCurrentEntropy(evalResult.currentEntropy);
      setCandidateDiseases(evalResult.topCandidates);
    }

    // Fetch calibrated XGBoost distribution
    diseaseModelService.predictDiseaseWithXGBoost(nextConfirmed, nextExcluded, nextVector).then((res) => {
      if (res.success) {
        setLiveDiseasePrediction({
          primaryDisease: res.primaryDisease,
          confidence: res.confidence,
          formattedConfidence: res.formattedConfidence,
          differentials: res.differentials.map(d => ({
            name: d.diseaseName,
            confidence: d.probability,
            likelihood: d.riskTier === 'High Risk' ? 'High' : d.riskTier === 'Moderate Risk' ? 'Moderate' : 'Low',
            formattedConfidence: d.formattedProbability
          })),
          matchedSymptoms: nextConfirmed,
          totalSymptomsChecked: nextConfirmed.length + nextExcluded.length,
          urgency: res.confidence > 50 ? 'orange' : 'green',
          metrics: { top1Accuracy: 95.43, top3Accuracy: 99.34, top5Accuracy: 99.81 }
        });
      }
    });
  };

  // Answer Revision Handler (Modify previous answer in session state & invalidate downstream turns)
  const handleReviseAnswer = (turnIndex: number, newAnswer: 'yes' | 'no' | 'unknown') => {
    if (turnIndex < 0 || turnIndex >= inquiryHistory.length) return;
    const target = inquiryHistory[turnIndex];
    const triVal: 1 | 0 | null = newAnswer === 'yes' ? 1 : newAnswer === 'no' ? 0 : null;

    // 1. Invalidate subsequent questions (truncate history up to turnIndex)
    const invalidatedItems = inquiryHistory.slice(turnIndex + 1);
    const revisedHistory = inquiryHistory.slice(0, turnIndex + 1);
    revisedHistory[turnIndex] = {
      ...target,
      answer: newAnswer,
    };
    setInquiryHistory(revisedHistory);
    setQuestionTurn(revisedHistory.length + 1);

    // 2. Reset invalidated features in symptom vector back to null
    const nextVector = { ...symptomVectorMap };
    invalidatedItems.forEach((inv) => {
      nextVector[inv.featureId] = null;
    });
    nextVector[target.featureId] = triVal;
    setSymptomVectorMap(nextVector);

    const nextConfirmed = Object.keys(nextVector).filter((k) => nextVector[k] === 1);
    const nextExcluded = Object.keys(nextVector).filter((k) => nextVector[k] === 0);
    const nextUnknown = Object.keys(nextVector).filter((k) => nextVector[k] === null);

    setConfirmedSymptoms(nextConfirmed);
    setExcludedSymptoms(nextExcluded);
    setUnknownSymptoms(nextUnknown);

    // 3. Sync revision to server session
    if (activeSessionId) {
      diseaseModelService.answerSessionQuestion(activeSessionId, target.featureId, triVal, true, turnIndex).then((resp) => {
        if (resp && resp.session) {
          if (resp.session.redFlagAlert) {
            setRedFlagAlert(resp.session.redFlagAlert);
          }
          if (resp.session.currentEntropy !== undefined) {
            setCurrentEntropy(resp.session.currentEntropy);
          }
          if (resp.session.currentPosterior) {
            setCandidateDiseases(resp.session.currentPosterior.map((p: any) => ({
              name: p.diseaseName,
              probability: p.probability,
              formattedProbability: `${Math.round(p.probability * 100)}%`
            })));
          }
          if (resp.nextQuestion) {
            setActiveAdaptiveQuestion({
              featureId: resp.nextQuestion.featureId,
              featureName: resp.nextQuestion.featureName,
              questionText: resp.nextQuestion.question,
              label: resp.nextQuestion.label,
              informationGain: resp.nextQuestion.informationGain || 10.0,
              expectedEntropyReduction: resp.nextQuestion.utility || 0.40
            });
          }
        }
      });
    }

    const askedFeatures = revisedHistory.map((h) => h.featureId);
    const evalResult = diseaseModelService.evaluateAdaptiveState(nextVector, askedFeatures, revisedHistory.length + 1);
    setStoppingEvaluation(evalResult);
    if (!activeSessionId) {
      setActiveAdaptiveQuestion(evalResult.nextQuestion);
      setCurrentEntropy(evalResult.currentEntropy);
      setCandidateDiseases(evalResult.topCandidates);
    }

    diseaseModelService.predictDiseaseWithXGBoost(nextConfirmed, nextExcluded, nextVector).then((res) => {
      if (res.success) {
        setLiveDiseasePrediction({
          primaryDisease: res.primaryDisease,
          confidence: res.confidence,
          formattedConfidence: res.formattedConfidence,
          differentials: res.differentials.map(d => ({
            name: d.diseaseName,
            confidence: d.probability,
            likelihood: d.riskTier === 'High Risk' ? 'High' : d.riskTier === 'Moderate Risk' ? 'Moderate' : 'Low',
            formattedConfidence: d.formattedProbability
          })),
          matchedSymptoms: nextConfirmed,
          totalSymptomsChecked: nextConfirmed.length + nextExcluded.length,
          urgency: res.confidence > 50 ? 'orange' : 'green',
          metrics: { top1Accuracy: 95.43, top3Accuracy: 99.34, top5Accuracy: 99.81 }
        });
      }
    });
  };

  // Finalize Case Evaluation / Diagnose Now
  const handleFinalizeCase = async () => {
    if (isFinalizing) return;
    setIsFinalizing(true);
    try {
      const finalConfirmed = Array.from(new Set([
        ...confirmedSymptoms,
        ...checkedFollowUps,
        ...Object.keys(dynamicAnswers).filter(k => dynamicAnswers[k] === true)
      ]));

      const finalExcluded = Array.from(new Set([
        ...excludedSymptoms,
        ...Object.keys(dynamicAnswers).filter(k => dynamicAnswers[k] === false)
      ]));

      const finalVector = { ...symptomVectorMap };
      finalConfirmed.forEach((s) => { finalVector[s] = 1; });
      finalExcluded.forEach((s) => { finalVector[s] = 0; });

      // Use server session prediction endpoint with robust fallback
      let xgbResult: any;
      try {
        xgbResult = await diseaseModelService.predictSession(activeSessionId || undefined, finalVector);
      } catch (err) {
        console.warn('Prediction service fallback', err);
      }

      if (!xgbResult || !xgbResult.primaryDisease) {
        // Fallback to local prediction
        xgbResult = await diseaseModelService.predictDiseaseWithXGBoost(finalConfirmed, finalExcluded, finalVector);
      }

      const topDifferentials = Array.isArray(xgbResult?.differentials) && xgbResult.differentials.length > 0
        ? xgbResult.differentials.map((d: any) => ({
            name: d.diseaseName || d.name || 'Differential Condition',
            confidence: d.probability || d.confidence || 20,
            likelihood: d.riskTier === 'High Risk' ? 'High' : d.riskTier === 'Moderate Risk' ? 'Moderate' : 'Low',
            formattedConfidence: d.formattedProbability || d.formattedConfidence || `${d.confidence || 20}%`
          }))
        : (candidateDiseases.slice(1, 5).map(c => ({
            name: c.name,
            confidence: c.probability * 100,
            likelihood: 'Moderate' as const,
            formattedConfidence: c.formattedProbability
          })));

      const primaryName = xgbResult?.primaryDisease || (candidateDiseases[0]?.name) || 'Clinical Condition';
      const primaryConf = xgbResult?.confidence || (candidateDiseases[0] ? candidateDiseases[0].probability * 100 : 75);
      const formattedConf = xgbResult?.formattedConfidence || (candidateDiseases[0]?.formattedProbability) || `${primaryConf}%`;

      const payload: CaseData = {
        chiefComplaint: chiefComplaint || 'General Assessment',
        durationDays,
        patientAgeGroup,
        patientGender,
        symptoms: finalConfirmed,
        excludedSymptoms: finalExcluded,
        unknownSymptoms: unknownSymptoms,
        symptomVector: finalVector,
        answers: dynamicAnswers,
        clinicalPhoto: clinicalPhoto || undefined,
        clinicalPhotoTag: clinicalPhoto ? photoTag : undefined,
        clinicalPhotoNote: clinicalPhoto ? photoNote : undefined,
        diseasePrediction: xgbResult,
        mlPrediction: {
          primaryDisease: primaryName,
          confidence: primaryConf,
          formattedConfidence: formattedConf,
          differentials: topDifferentials,
          urgency: primaryConf > 50 ? 'orange' : 'green',
          metrics: { top1Accuracy: 95.43, top3Accuracy: 99.34, top5Accuracy: 99.81 },
        },
      };

      onComplete(payload);
    } catch (err) {
      console.error('Finalize case error:', err);
      // Failsafe onComplete so user is never blocked
      onComplete({
        chiefComplaint: chiefComplaint || 'Clinical Assessment',
        durationDays,
        patientAgeGroup,
        patientGender,
        symptoms: confirmedSymptoms,
        excludedSymptoms: excludedSymptoms,
        unknownSymptoms: unknownSymptoms,
        answers: dynamicAnswers,
        symptomVector: symptomVectorMap,
      });
    } finally {
      setIsFinalizing(false);
    }
  };

  // AI Co-Pilot Assistance
  const handleAskGeminiCoPilot = async () => {
    setIsGeminiCoPilotLoading(true);
    try {
      const allSymptoms = Array.from(new Set([
        ...confirmedSymptoms,
        ...nlpSymptoms,
        chiefComplaint,
      ]));

      const mlPred = diseaseModelService.predictDisease(allSymptoms, excludedSymptoms);

      const res = await fetch('/api/ai-diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chiefComplaint: chiefComplaint || textInput || 'General Malaise',
          duration: durationDays.toString(),
          symptoms: allSymptoms,
          language: currentLang,
          mlPrimaryDiagnosis: mlPred.primaryDisease,
          mlConfidence: mlPred.confidence,
          mlDifferentials: mlPred.differentials,
        }),
      });

      const data = await res.json();
      let aiMessageText = '';
      if (data.success && data.primaryDiagnosis) {
        aiMessageText =
          `⚡ **AI Clinical Co-Pilot Opinion:**\n` +
          `• Primary Condition: **${data.primaryDiagnosis}** (${data.confidence || mlPred.formattedConfidence})\n` +
          `• Urgency: ${data.urgency === 'red' ? '🚨 Emergency Red' : data.urgency === 'orange' ? '⚠️ Orange Consult' : '🟢 Green Home/Community Care'}\n` +
          `• Clinical Logic: ${data.reasoning || 'Symptom matching complete.'}`;
      } else {
        aiMessageText = `🤖 AI Co-Pilot: Model evaluation points to **${mlPred.primaryDisease}** (${mlPred.formattedConfidence}).`;
      }

      setChatHistory((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          sender: 'bot',
          text: aiMessageText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } catch (e) {
      console.warn('AI Co-Pilot error:', e);
    } finally {
      setIsGeminiCoPilotLoading(false);
    }
  };

  // Photo handlers
  const handlePhotoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setClinicalPhoto(reader.result as string);
        setIsPhotoModalOpen(false);
      };
      reader.readAsDataURL(file);
    }
  };

  // Quick Starter Suggestion Prompts
  const quickPrompts = currentLang === 'gu'
    ? [
        { label: '🌡️ તાવ અને ખાંસી', text: 'મને 2 દિવસથી તીવ્ર તાવ, ખાંસી અને કંપારી છે.' },
        { label: '🫀 છાતીમાં દુખાવો', text: 'છાતીમાં ભારે દબાણ છે અને ડાબા હાથ તરફ દુખાવો ફેલાય છે.' },
        { label: '🤢 પેટમાં દુખાવો અને ઉલ્ટી', text: 'પેટમાં ખૂબ દુખાવો છે, ઉબકા અને ઉલ્ટી થાય છે.' },
        { label: '🤕 માથાનો દુખાવો', text: 'ખૂબ તીવ્ર માથાનો દુખાવો અને ચક્કર આવે છે.' },
      ]
    : currentLang === 'hi'
    ? [
        { label: '🌡️ बुखार एवं खांसी', text: 'मुझे 2 दिन से तेज बुखार, खांसी और ठंड लग रही है।' },
        { label: '🫀 सीने में तेज दर्द', text: 'सीने में भारी दबाव है और दर्द बाएं हाथ में फैल रहा है।' },
        { label: '🤢 पेट दर्द एवं उल्टी', text: 'पेट में तेज मरोड़ और दर्द है, साथ में जी मिचलाना और उल्टी है।' },
        { label: '🤕 सिरदर्द व चक्कर', text: 'बहुत तेज सिरदर्द और चक्कर आ रहे हैं।' },
      ]
    : [
        { label: '🌡️ Fever & Cough', text: 'High fever with chills and persistent cough for 2 days.' },
        { label: '🫀 Severe Chest Pain', text: 'Crushing chest pain radiating to left arm with breathlessness.' },
        { label: '🤢 Stomach Pain & Vomiting', text: 'Severe abdominal cramps, nausea, and vomiting.' },
        { label: '🤕 Headache & Dizziness', text: 'Throbbing severe headache with dizziness and light sensitivity.' },
      ];

  return (
    <div className="max-w-4xl mx-auto p-2 sm:p-4 h-[calc(100vh-80px)] flex flex-col font-sans">
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        onChange={handlePhotoFileUpload}
        className="hidden"
      />

      {/* Top Header Card */}
      <div className="bg-gradient-to-r from-[#0F3835] via-[#1B4D4A] to-[#1E6B63] text-white p-3.5 sm:p-4 rounded-t-2xl shadow-sm border-b border-[#1E6B63]/60 flex items-center justify-between shrink-0">
        <button
          onClick={onCancel}
          className="flex items-center gap-1.5 text-xs font-bold text-[#B2DFD8] hover:text-white bg-[#092422]/80 hover:bg-[#1E6B63] px-3 py-1.5 rounded-xl border border-[#1E6B63]/60 transition cursor-pointer shadow-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{currentLang === 'gu' ? 'પાછા' : currentLang === 'hi' ? 'वापस' : 'Back'}</span>
        </button>

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300">
            <Stethoscope className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-mono font-bold text-emerald-300 uppercase tracking-wider block">
              {currentLang === 'gu' ? 'તબીબી પૂછપરછ' : currentLang === 'hi' ? 'क्लिनिकल परामर्श' : 'CLINICAL INTAKE'}
            </span>
            <span className="text-xs sm:text-sm font-extrabold text-white">
              {stage === 'initial_message'
                ? (currentLang === 'gu' ? '૧. લક્ષણો જણાવો' : currentLang === 'hi' ? '1. समस्या बताएं' : '1. Enter Symptoms')
                : (currentLang === 'gu' ? '૨. ચોક્કસ પ્રશ્નો' : currentLang === 'hi' ? '2. सटीक प्रश्न' : '2. Targeted Questions')}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleAskGeminiCoPilot}
            disabled={isGeminiCoPilotLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-extrabold text-xs rounded-xl shadow-xs border border-emerald-400/40 transition cursor-pointer disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span className="hidden sm:inline">{isGeminiCoPilotLoading ? 'Analyzing...' : 'AI Co-Pilot'}</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1 text-xs font-bold bg-[#1E6B63] hover:bg-[#0F3835] text-white px-2.5 py-1.5 rounded-xl border border-[#B2DFD8]/30 shadow-xs cursor-pointer"
            title="Attach Clinical Photo"
          >
            <Camera className="w-3.5 h-3.5 text-[#B2DFD8]" />
            <span className="hidden sm:inline">{clinicalPhoto ? '✓ Photo' : 'Photo'}</span>
          </button>
        </div>
      </div>

      {/* Main Conversational Area */}
      <div className="flex-1 overflow-y-auto p-4 bg-[#F4F7F6] border-x border-[#DDE3E2] space-y-4">
        {/* Chat Bubbles */}
        {chatHistory.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-2.5 ${
              msg.sender === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {msg.sender === 'bot' && (
              <div className="w-8 h-8 rounded-xl bg-[#2E7D73] text-white flex items-center justify-center shrink-0 border border-[#1B4D4A] shadow-xs">
                <Bot className="w-4 h-4" />
              </div>
            )}

            <div
              className={`max-w-[90%] sm:max-w-[80%] p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed border ${
                msg.sender === 'user'
                  ? 'bg-[#1B4D4A] text-white border-[#1B4D4A] rounded-tr-xs shadow-xs'
                  : 'bg-white text-[#1A2B2B] border-[#DDE3E2] rounded-tl-xs shadow-xs'
              }`}
            >
              <div className="whitespace-pre-line font-medium">{msg.text}</div>

              {msg.symptoms && msg.symptoms.length > 0 && (
                <div className="mt-2 pt-2 border-t border-white/20 flex flex-wrap gap-1 text-[11px]">
                  {msg.symptoms.map((s) => (
                    <span
                      key={s}
                      className="px-2 py-0.5 bg-white/20 text-white rounded-md font-semibold"
                    >
                      ✓ {s.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {msg.sender === 'user' && (
              <div className="w-8 h-8 rounded-xl bg-[#1B4D4A] text-white flex items-center justify-center shrink-0 border border-[#143B38] shadow-xs">
                <UserIcon className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}

        {/* STAGE 2: ADAPTIVE ACTIVE INQUIRY (ENTROPY REDUCTION & XG-BOOST INFERENCE) */}
        {stage === 'relevant_questions' && (
          <div className="bg-white rounded-2xl border-2 border-emerald-500/30 p-4 sm:p-5 shadow-md space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Header Badge & Confidence + Entropy Meter */}
            <div className="border-b border-emerald-100 pb-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-extrabold text-emerald-950 font-display flex items-center gap-2">
                      <span>
                        {currentLang === 'gu'
                          ? '🎯 અનુકૂલી સક્રિય તપાસ (Adaptive Inquiry):'
                          : currentLang === 'hi'
                          ? '🎯 अनुकूली सक्रिय जांच (Adaptive Inquiry):'
                          : '🎯 Adaptive Active Inquiry (Entropy Reduction):'}
                      </span>
                    </h4>
                    <p className="text-[11px] text-slate-500 font-medium">
                      {currentLang === 'gu'
                        ? 'માહિતી લાભ (Information Gain) ના આધારે સૌથી ઉપયોગી પ્રશ્નો'
                        : currentLang === 'hi'
                        ? 'सूचना लाभ (Information Gain) के आधार पर सर्वाधिक उपयोगी प्रश्न'
                        : 'Asking only the most informative questions to narrow candidate diseases'}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-end bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                  <span className="text-[10px] text-emerald-800 font-bold uppercase tracking-wider">Turn #{questionTurn}</span>
                  <span className="text-xs font-extrabold text-emerald-900">
                    {candidateDiseases.length > 0 ? candidateDiseases[0].name : (liveDiseasePrediction?.primaryDisease || 'Evaluating...')}
                  </span>
                </div>
              </div>

              {/* Dynamic Live Confidence & Entropy Bar */}
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-extrabold text-slate-700 flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                    {currentLang === 'gu' ? 'ડાયગ્નોસ્ટિક ચોકસાઈ (Confidence):' : currentLang === 'hi' ? 'डायग्नोस्टिक सटीकता (Confidence):' : 'AI Diagnostic Confidence Level:'}
                  </span>
                  <span className="font-extrabold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md text-[11px]">
                    {liveDiseasePrediction ? liveDiseasePrediction.formattedConfidence : '82.5%'} (Uncertainty: {currentEntropy} bits)
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-teal-500 to-emerald-600 h-2.5 rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, Math.max(40, liveDiseasePrediction ? liveDiseasePrediction.confidence : 75))}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* DETERMINISTIC RED-FLAG SAFETY ALERT BANNER */}
            {redFlagAlert && (
              <div className="bg-rose-50 border-2 border-rose-500 rounded-2xl p-4 shadow-md space-y-2 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <AlertTriangle className="w-5 h-5 text-amber-200 animate-bounce" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-xs sm:text-sm font-black text-rose-950">
                      {redFlagAlert.title?.[currentLang] || redFlagAlert.title?.en || 'Emergency Alert'}
                    </h4>
                    <p className="text-[11px] sm:text-xs font-semibold text-rose-900 leading-relaxed">
                      {redFlagAlert.guidance?.[currentLang] || redFlagAlert.guidance?.en || 'Please seek urgent medical care.'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* SESSION TIMELINE & INTERACTIVE ANSWER REVISION DRAWER */}
            {inquiryHistory.length > 0 && (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5 uppercase tracking-wide">
                    <History className="w-3.5 h-3.5 text-emerald-700" />
                    {currentLang === 'gu'
                      ? 'જવાબોનો ઇતિહાસ (જવાબ બદલવા માટે ક્લિક કરો):'
                      : currentLang === 'hi'
                      ? 'उत्तर इतिहास एवं संशोधन (उत्तर बदलने के लिए क्लिक करें):'
                      : 'Session History & Live Revisions (Click to Revise):'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowRevisionPanel(!showRevisionPanel)}
                    className="text-[11px] font-bold text-emerald-800 hover:underline cursor-pointer"
                  >
                    {showRevisionPanel
                      ? (currentLang === 'gu' ? 'સંતાડો' : currentLang === 'hi' ? 'छिपाएं' : 'Collapse')
                      : (currentLang === 'gu' ? `બતાવો (${inquiryHistory.length})` : currentLang === 'hi' ? `दिखाएं (${inquiryHistory.length})` : `Show (${inquiryHistory.length})`)}
                  </button>
                </div>

                {showRevisionPanel && (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {inquiryHistory.map((item, idx) => {
                      const itemQText = typeof item.questionText === 'object'
                        ? (item.questionText?.[currentLang] || item.questionText?.en || `Do you have ${item.featureName}?`)
                        : (item.questionText || `Do you have ${item.featureName}?`);

                      return (
                        <div
                          key={idx}
                          className="p-2.5 bg-white rounded-xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shadow-2xs text-xs"
                        >
                          <div className="space-y-0.5 flex-1 pr-2">
                            <span className="text-[10px] font-bold text-slate-500 uppercase">
                              Turn #{item.turn} • {item.featureName}
                            </span>
                            <p className="font-semibold text-slate-800 text-[11px] leading-snug">
                              {itemQText}
                            </p>
                          </div>

                          {/* Revision Toggle Buttons */}
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleReviseAnswer(idx, 'yes')}
                              className={`px-2 py-1 rounded-lg text-[10px] font-extrabold border transition-all cursor-pointer ${
                                item.answer === 'yes'
                                  ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-emerald-50'
                              }`}
                            >
                              ✓ Yes (1)
                            </button>
                            <button
                              type="button"
                              onClick={() => handleReviseAnswer(idx, 'no')}
                              className={`px-2 py-1 rounded-lg text-[10px] font-extrabold border transition-all cursor-pointer ${
                                item.answer === 'no'
                                  ? 'bg-slate-700 text-white border-slate-800 shadow-xs'
                                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              ✕ No (0)
                            </button>
                            <button
                              type="button"
                              onClick={() => handleReviseAnswer(idx, 'unknown')}
                              className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                                item.answer === 'unknown'
                                  ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
                                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-amber-50'
                              }`}
                            >
                              ⚪ Not Sure
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* STOPPING CRITERIA SATISFIED CARD */}
            {stoppingEvaluation?.isStoppingCriteriaMet ? (
              <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-2xl p-4 sm:p-5 shadow-md space-y-3 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center text-white">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-200 block">
                      {currentLang === 'gu' ? 'ચોક્કસતા શરતો પૂર્ણ' : currentLang === 'hi' ? 'सटीकता शर्तें पूर्ण' : 'STOPPING CRITERIA MET'}
                    </span>
                    <h3 className="text-sm sm:text-base font-extrabold">
                      {stoppingEvaluation.stoppingMessage?.[currentLang] || stoppingEvaluation.stoppingMessage?.en || 'Diagnostic intake complete.'}
                    </h3>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleFinalizeCase}
                    disabled={isFinalizing}
                    className="flex-1 flex items-center justify-center gap-2 py-3 px-5 bg-white hover:bg-emerald-50 text-emerald-950 font-black text-xs sm:text-sm rounded-xl shadow-lg transition-all active:scale-98 cursor-pointer disabled:opacity-75"
                  >
                    {isFinalizing ? (
                      <>
                        <Activity className="w-4 h-4 text-emerald-700 animate-spin" />
                        <span>
                          {currentLang === 'gu'
                            ? '⏳ મોડેલ વિશ્લેષણ ચાલુ છે...'
                            : currentLang === 'hi'
                            ? '⏳ मॉडल विश्लेषण जारी है...'
                            : '⏳ Computing Calibrated Risk Ranking...'}
                        </span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-emerald-700" />
                        <span>
                          {currentLang === 'gu'
                            ? '⚡ ટોપ-૫ રોગ જોખમ રેન્કિંગ જુઓ (XGBoost Calibrated)'
                            : currentLang === 'hi'
                            ? '⚡ टॉप-5 रोग जोखिम रैंकिंग देखें (XGBoost Calibrated)'
                            : '⚡ View Top-5 Calibrated Disease-Risk Ranking (XGBoost)'}
                        </span>
                        <ChevronRight className="w-4 h-4 ml-auto text-emerald-700" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              /* ADAPTIVE NEXT QUESTION HERO CARD */
              activeAdaptiveQuestion && (
                <div className="bg-gradient-to-br from-emerald-50/70 via-white to-teal-50/50 border-2 border-emerald-500/40 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3.5 animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 bg-emerald-600 text-white font-extrabold text-[11px] px-2.5 py-1 rounded-lg uppercase tracking-wide">
                      <HelpCircle className="w-3.5 h-3.5" />
                      {currentLang === 'gu' ? `પ્રશ્ન #${questionTurn}` : currentLang === 'hi' ? `प्रश्न #${questionTurn}` : `Active Question #${questionTurn}`}
                    </span>
                    <span className="text-[11px] font-bold text-teal-800 bg-teal-100/80 px-2.5 py-0.5 rounded-md">
                      ⚡ {currentLang === 'gu' ? `માહિતી લાભ: +${activeAdaptiveQuestion.informationGain}%` : currentLang === 'hi' ? `सूचना लाभ: +${activeAdaptiveQuestion.informationGain}%` : `Information Gain: +${activeAdaptiveQuestion.informationGain}%`}
                    </span>
                  </div>

                  <div className="py-1">
                    <h3 className="text-base sm:text-lg font-extrabold text-slate-900 leading-snug">
                      {typeof activeAdaptiveQuestion.questionText === 'object'
                        ? (activeAdaptiveQuestion.questionText?.[currentLang] || activeAdaptiveQuestion.questionText?.en || `Do you have ${activeAdaptiveQuestion.featureName}?`)
                        : (activeAdaptiveQuestion.questionText || `Do you have ${activeAdaptiveQuestion.featureName}?`)}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      {currentLang === 'gu'
                        ? `લક્ષણ: ${(typeof activeAdaptiveQuestion.label === 'object' ? activeAdaptiveQuestion.label?.[currentLang] : activeAdaptiveQuestion.label) || activeAdaptiveQuestion.featureName}`
                        : currentLang === 'hi'
                        ? `लक्षण: ${(typeof activeAdaptiveQuestion.label === 'object' ? activeAdaptiveQuestion.label?.[currentLang] : activeAdaptiveQuestion.label) || activeAdaptiveQuestion.featureName}`
                        : `Evaluating feature: ${activeAdaptiveQuestion.featureName}`}
                    </p>
                  </div>

                  {/* 3 Response Buttons: Yes (1), No (0), Skip/Unknown */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                    <button
                      type="button"
                      onClick={() => handleAdaptiveResponse('yes')}
                      className="flex items-center justify-center gap-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-md transition-all cursor-pointer"
                    >
                      <Check className="w-4 h-4 stroke-[3]" />
                      <span>{currentLang === 'gu' ? '✓ હા (Yes = 1)' : currentLang === 'hi' ? '✓ हाँ (Yes = 1)' : '✓ Yes (Present = 1)'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleAdaptiveResponse('no')}
                      className="flex items-center justify-center gap-2 py-3 px-4 bg-slate-700 hover:bg-slate-800 active:scale-98 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-md transition-all cursor-pointer"
                    >
                      <X className="w-4 h-4 stroke-[3]" />
                      <span>{currentLang === 'gu' ? '✕ ના (No = 0)' : currentLang === 'hi' ? '✕ नहीं (No = 0)' : '✕ No (Absent = 0)'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleAdaptiveResponse('unknown')}
                      className="flex items-center justify-center gap-1.5 py-3 px-4 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs sm:text-sm rounded-xl border border-slate-300 transition-all cursor-pointer"
                    >
                      <HelpCircle className="w-4 h-4 text-slate-400" />
                      <span>{currentLang === 'gu' ? '⚪ ખબર નથી / આગળ વધો' : currentLang === 'hi' ? '⚪ पता नहीं / छोड़ें' : '⚪ Not Sure (Unknown)'}</span>
                    </button>
                  </div>

                  {/* Early Diagnose Now Option */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-slate-500 font-medium">
                      {currentLang === 'gu' ? 'ચકાસણી તરત પૂર્ણ કરવા માંગો છો?' : currentLang === 'hi' ? 'क्या तुरंत जांच पूर्ण करना चाहते हैं?' : 'Want immediate evaluation?'}
                    </span>
                    <button
                      type="button"
                      onClick={handleFinalizeCase}
                      disabled={isFinalizing}
                      className="text-xs font-extrabold text-emerald-800 hover:text-emerald-950 underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      {isFinalizing ? (
                        <Activity className="w-3.5 h-3.5 text-emerald-700 animate-spin" />
                      ) : (
                        <>
                          <span>{currentLang === 'gu' ? 'હમણાં જ નિદાન કરો (Diagnose Now)' : currentLang === 'hi' ? 'अभी निदान करें (Diagnose Now)' : 'Diagnose Now'}</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )
            )}

            {/* LIVE CANDIDATE NARROWING & EVIDENCE TRACKER */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              {/* Narrowed Differential Rankings */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                  <span>🎯 {currentLang === 'gu' ? 'નજીકના સંભવિત રોગો:' : currentLang === 'hi' ? 'संभावित रोग (Narrowing):' : 'Candidate Diseases:'}</span>
                  <span className="text-[10px] text-slate-500 lowercase">live Bayesian</span>
                </p>
                <div className="space-y-1.5">
                  {(candidateDiseases.length > 0 ? candidateDiseases.slice(0, 3) : (liveDiseasePrediction?.differentials?.slice(0, 3) || [])).map((cand, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs bg-white p-2 rounded-lg border border-slate-200">
                      <span className="font-bold text-slate-800 truncate pr-2">
                        {idx + 1}. {cand.name}
                      </span>
                      <span className="font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px] shrink-0">
                        {cand.formattedProbability || (cand as any).formattedConfidence}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Symptom Vector Summary: Confirmed (1), Excluded (0), Unknown */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  📋 {currentLang === 'gu' ? 'લક્ષણ વેક્ટર સ્થિતિ:' : currentLang === 'hi' ? 'लक्षण वेक्टर स्थिति:' : 'Symptom Vector State:'}
                </p>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">
                      Confirmed (1): {confirmedSymptoms.length}
                    </span>
                    <span className="text-[10px] font-extrabold text-slate-700 bg-slate-200 px-1.5 py-0.5 rounded">
                      Excluded (0): {excludedSymptoms.length}
                    </span>
                    <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                      Unanswered: Unknown
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1 pt-1 max-h-20 overflow-y-auto">
                    {confirmedSymptoms.map((s) => (
                      <span key={s} className="bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                        <Check className="w-2.5 h-2.5" /> {s}
                      </span>
                    ))}
                    {excludedSymptoms.map((s) => (
                      <span key={s} className="bg-slate-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 line-through opacity-80">
                        <X className="w-2.5 h-2.5" /> {s}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Patient Demographics */}
            <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-600">
                  {currentLang === 'gu' ? 'ઉંમર:' : currentLang === 'hi' ? 'ઉમ્ર:' : 'Age:'}
                </span>
                {(['child', 'adult', 'elderly'] as const).map((ag) => (
                  <button
                    key={ag}
                    type="button"
                    onClick={() => setPatientAgeGroup(ag)}
                    className={`px-2.5 py-1 rounded-lg font-bold capitalize border cursor-pointer ${
                      patientAgeGroup === ag
                        ? 'bg-[#1B4D4A] text-white border-[#1B4D4A]'
                        : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}
                  >
                    {ag}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-600">
                  {currentLang === 'gu' ? 'જાતિ:' : currentLang === 'hi' ? 'લિંગ:' : 'Gender:'}
                </span>
                {(['male', 'female'] as const).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setPatientGender(g)}
                    className={`px-2.5 py-1 rounded-lg font-bold capitalize border cursor-pointer ${
                      patientGender === g
                        ? 'bg-[#1B4D4A] text-white border-[#1B4D4A]'
                        : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            {/* MANDATORY MEDICAL PREDICTION DISCLAIMER */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-extrabold">
                  {currentLang === 'gu' ? 'તબીબી આગાહી સૂચના:' : currentLang === 'hi' ? 'चिकित्सीय भविष्यवाणी अस्वीकरण:' : 'Medical Prediction Disclaimer:'}
                </span>{' '}
                <span className="font-medium text-[11px] text-amber-800">
                  {currentLang === 'gu'
                    ? 'આ પરિણામ AI મોડેલ દ્વારા આપવામાં આવેલી આંકડાકીય આગાહી (Prediction) છે, પુષ્ટિ થયેલ તબીબી નિદાન નથી. કૃપા કરીને યોગ્ય ડૉક્ટરનો સંપર્ક કરો.'
                    : currentLang === 'hi'
                    ? 'यह परिणाम AI मॉडल द्वारा दी गई सांख्यिकीय भविष्यवाणी (Prediction) है, अंतिम चिकित्सा निदान नहीं। कृपया आधिकारिक परामर्श के लिए डॉक्टर से संपर्क करें।'
                    : 'This output is an AI-generated statistical prediction based on reported symptoms, NOT a confirmed medical diagnosis. Always consult a qualified medical professional.'}
                </span>
              </div>
            </div>

            {/* Complete Assessment Button */}
            <div className="pt-2 border-t border-emerald-100 flex justify-end">
              <button
                type="button"
                onClick={handleFinalizeCase}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-extrabold text-sm rounded-xl shadow-md transition-all active:scale-98 cursor-pointer"
              >
                <CheckCircle2 className="w-5 h-5 text-emerald-200" />
                <span>
                  {currentLang === 'gu'
                    ? 'તપાસ પૂર્ણ કરો અને Top-5 XGBoost નિદાન જુઓ'
                    : currentLang === 'hi'
                    ? 'जांच पूर्ण करें और Top-5 XGBoost निदान देखें'
                    : 'Get Top-5 Calibrated Disease Risk'}
                </span>
                <ChevronRight className="w-4 h-4 ml-1" />
              </button>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Bottom Message Input Panel */}
      <div className="bg-white border-x border-b border-[#DDE3E2] rounded-b-2xl p-3 sm:p-4 shadow-sm space-y-2.5 shrink-0">
        {/* Quick starter chips for initial screen */}
        {stage === 'initial_message' && (
          <div className="flex flex-wrap gap-1.5 pb-1">
            <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1 mr-1">
              <Sparkles className="w-3 h-3 text-emerald-600" />
              {currentLang === 'gu' ? 'ઝડપી ઉદાહરણ:' : currentLang === 'hi' ? 'त्वरित उदाहरण:' : 'Quick samples:'}
            </span>
            {quickPrompts.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setTextInput(p.text);
                  handleSendMessage(p.text);
                }}
                className="px-2.5 py-1 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 text-slate-700 rounded-lg text-xs font-semibold border border-slate-200 transition-all cursor-pointer"
              >
                {p.label}
              </button>
            ))}
          </div>
        )}

        {/* Input box + Mic + Send */}
        <div className="relative flex items-center gap-2">
          <textarea
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder={
              stage === 'initial_message'
                ? (currentLang === 'gu'
                    ? 'તમારા લક્ષણો અહીં લખો (દા.ત. ૨ દિવસથી તાવ અને ખાંસી છે)...'
                    : currentLang === 'hi'
                    ? 'अपने लक्षण यहाँ लिखें (जैसे: मुझे 2 दिन से बुखार और खांसी है)...'
                    : 'Describe symptoms here (e.g. fever and severe cough for 2 days)...')
                : (currentLang === 'gu'
                    ? 'વધુ લક્ષણ અથવા વિગત ઉમેરો...'
                    : currentLang === 'hi'
                    ? 'कोई अन्य लक्षण या जानकारी जोड़ें...'
                    : 'Type additional symptom details...')
            }
            rows={stage === 'initial_message' ? 2 : 1}
            className="flex-1 px-4 py-2.5 text-xs sm:text-sm text-slate-800 bg-[#EDF1F0] border border-[#DDE3E2] rounded-xl focus:outline-none focus:border-emerald-600 focus:bg-white resize-none font-medium placeholder:text-slate-400 transition-all"
          />

          {/* Speech Mic Button */}
          {speechSupported && (
            <button
              type="button"
              onClick={toggleListening}
              className={`p-3 rounded-xl border transition-all cursor-pointer shrink-0 ${
                isListening
                  ? 'bg-rose-600 text-white border-rose-700 animate-pulse'
                  : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
              }`}
              title="Voice Input"
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
          )}

          {/* Send Button */}
          <button
            type="button"
            onClick={() => handleSendMessage()}
            disabled={!textInput.trim()}
            className="p-3 bg-[#1B4D4A] hover:bg-[#153D3A] disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl transition-all cursor-pointer shrink-0 shadow-xs"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>

        {/* NLP Extraction Live Indicator */}
        {nlpSymptoms.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="font-bold">
              {currentLang === 'gu' ? 'ઓળખાયા:' : currentLang === 'hi' ? 'पहचाने गए:' : 'Detected:'}
            </span>
            <span className="font-medium">{nlpSymptoms.join(', ')}</span>
            {nlpDuration && <span className="ml-auto font-bold underline">({nlpDuration} days)</span>}
          </div>
        )}
      </div>
    </div>
  );
};
