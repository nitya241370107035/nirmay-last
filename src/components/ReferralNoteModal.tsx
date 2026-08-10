import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Copy, Share2, FileText, Check, AlertCircle, Download, FileSpreadsheet } from 'lucide-react';
import { Patient, CaseData, DiagnosisResult, RiskLevel, LanguageCode } from '../types';
import { generateReferralText, generateReferralPDF } from '../engine/referralNote';

interface ReferralNoteModalProps {
  patient: Patient | null | undefined;
  caseData: CaseData;
  diagnosis: DiagnosisResult;
  medicinesGiven?: (string | { name: { en: string; hi: string; gu: string } | string })[];
  risk?: RiskLevel;
  onClose: () => void;
}

export const ReferralNoteModal: React.FC<ReferralNoteModalProps> = ({
  patient,
  caseData,
  diagnosis,
  medicinesGiven = [],
  risk,
  onClose,
}) => {
  const { i18n } = useTranslation();
  const currentLang = (i18n.language || 'en') as LanguageCode;

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  // Generate plain-text note dynamically
  const noteText = useMemo(() => {
    return generateReferralText({
      patient,
      caseData,
      diagnosis,
      medicinesGiven,
      risk,
      lang: currentLang,
    });
  }, [patient, caseData, diagnosis, medicinesGiven, risk, currentLang]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // 1. Copy to Clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(noteText);
      showToast(
        currentLang === 'gu'
          ? 'રિફરલ નોટ કોપી થઈ ગઈ! તમે WhatsApp અથવા સંદેશમાં પેસ્ટ કરી શકો છો.'
          : currentLang === 'hi'
          ? 'रेफरल नोट कॉपी हो गया! आप इसे मैसेज या वॉट्सऐप पर पेस्ट कर सकते हैं।'
          : 'Referral note copied. You can now paste it into any message.'
      );
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
      showToast('Copy failed. Please select text manually.');
    }
  };

  // 2. Share as Text (Web Share API)
  const handleShare = async () => {
    const patientName = patient?.name || caseData.patientName || 'Patient';
    const title = `Referral Note - ${patientName} (Nirāmay)`;

    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: noteText,
        });
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.warn('Share API error:', err);
          handleCopy();
        }
      }
    } else {
      // Fallback
      handleCopy();
    }
  };

  // 3. Download as PDF
  const handleDownloadPDF = async () => {
    setIsGeneratingPdf(true);
    setPdfError(null);

    try {
      const pdfBlob = await generateReferralPDF({
        patient,
        caseData,
        diagnosis,
        medicinesGiven,
        risk,
        lang: currentLang,
      });

      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      const safeName = (patient?.name || caseData.patientName || 'Patient').replace(/[^a-zA-Z0-9]/g, '_');
      const dateStr = new Date().toISOString().slice(0, 10);

      link.href = url;
      link.download = `Referral_Note_${safeName}_${dateStr}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setTimeout(() => URL.revokeObjectURL(url), 1000);

      showToast(
        currentLang === 'gu'
          ? 'PDF રિફરલ નોટ ડાઉનલોડ થઈ ગઈ.'
          : currentLang === 'hi'
          ? 'PDF रेफरल नोट डाउनलोड हो गया।'
          : 'PDF referral note downloaded.'
      );
    } catch (err) {
      console.error('PDF Download failed:', err);
      setPdfError(
        currentLang === 'gu'
          ? 'PDF નિર્માણમાં ભૂલ થઈ. તમે કોપી ટેક્સ્ટનો ઉપયોગ કરી શકો છો.'
          : currentLang === 'hi'
          ? 'PDF बनाने में त्रुटि। आप टेक्स्ट कॉपी विकल्प का उपयोग कर सकते हैं।'
          : 'PDF generation unavailable offline. Use Copy or Share Text instead.'
      );
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const labels = {
    modalTitle: currentLang === 'gu' ? 'ક્લિનિકલ રિફરલ નોટ' : currentLang === 'hi' ? 'क्लिनिकल रेफरल नोट' : 'Clinical Referral Note',
    modalSub: currentLang === 'gu'
      ? 'ઉચ્ચ આરોગ્ય કેન્દ્રના ડૉક્ટરને મોકલવા માટે વિગતવાર કેસ રિપોર્ટ'
      : currentLang === 'hi'
      ? 'उच्च स्वास्थ्य केंद्र के डॉक्टर के लिए विस्तृत केस रिपोर्ट'
      : 'Formatted summary for doctor at receiving hospital / CHC',
    copyBtn: currentLang === 'gu' ? 'કોપી કરો (Text)' : currentLang === 'hi' ? 'कॉपी करें' : 'Copy Text',
    shareBtn: currentLang === 'gu' ? 'શેર કરો (Share)' : currentLang === 'hi' ? 'शेयर करें' : 'Share Text',
    pdfBtn: currentLang === 'gu' ? 'PDF ડાઉનલોડ' : currentLang === 'hi' ? 'PDF डाउनलोड' : 'Download PDF',
    generatingPdf: currentLang === 'gu' ? 'PDF બને છે...' : currentLang === 'hi' ? 'PDF बन रहा है...' : 'Generating PDF...',
  };

  return (
    <div className="fixed inset-0 bg-[#1A2B2B]/75 backdrop-blur-xs z-50 overflow-y-auto p-3 sm:p-4 flex items-center justify-center font-sans">
      <div className="bg-white rounded-3xl max-w-2xl w-full border border-[#DDE3E2] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Toast Alert Header */}
        {toastMessage && (
          <div className="bg-[#1B4D4A] text-white px-4 py-2.5 text-xs font-bold flex items-center justify-center gap-2 border-b border-[#2E7D73] animate-fade-in">
            <Check className="w-4 h-4 text-[#B2DFD8]" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Modal Header */}
        <div className="bg-[#1B4D4A] text-white p-5 border-b border-[#2E7D73] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#2E7D73] rounded-xl text-white">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold font-display leading-tight">
                {labels.modalTitle}
              </h2>
              <p className="text-xs text-[#B2DFD8] mt-0.5">
                {labels.modalSub}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Monospace Preview Slip */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-3 bg-[#F4F7F6] flex-1">
          {pdfError && (
            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{pdfError}</span>
            </div>
          )}

          <div className="relative">
            <div className="p-4 sm:p-5 bg-[#FFFDF7] rounded-2xl border-2 border-dashed border-[#DDE3E2] shadow-inner font-mono text-xs sm:text-sm text-[#1A2B2B] leading-relaxed whitespace-pre-wrap select-all">
              {noteText}
            </div>
          </div>
        </div>

        {/* Bottom Toolbar Action Area */}
        <div className="p-4 bg-white border-t border-[#DDE3E2] flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <div className="grid grid-cols-3 gap-2 w-full sm:w-auto">
            {/* Copy Button */}
            <button
              onClick={handleCopy}
              className="px-3.5 py-2.5 bg-[#EDF1F0] hover:bg-[#DDE3E2] text-[#1B4D4A] font-bold text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 border border-[#DDE3E2]"
            >
              <Copy className="w-4 h-4 text-[#2E7D73]" />
              <span className="hidden sm:inline">{labels.copyBtn}</span>
              <span className="sm:hidden">Copy</span>
            </button>

            {/* Share Text Button */}
            <button
              onClick={handleShare}
              className="px-3.5 py-2.5 bg-[#1B4D4A] hover:bg-[#143B39] text-white font-bold text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
            >
              <Share2 className="w-4 h-4 text-[#B2DFD8]" />
              <span className="hidden sm:inline">{labels.shareBtn}</span>
              <span className="sm:hidden">Share</span>
            </button>

            {/* Download PDF Button */}
            <button
              onClick={handleDownloadPDF}
              disabled={isGeneratingPdf}
              className="px-3.5 py-2.5 bg-[#2E7D73] hover:bg-[#23635B] text-white font-bold text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-50"
            >
              <Download className="w-4 h-4 text-[#B2DFD8]" />
              <span>{isGeneratingPdf ? labels.generatingPdf : labels.pdfBtn}</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 bg-white hover:bg-[#F4F7F6] text-[#5F6D6C] font-bold text-xs rounded-xl border border-[#DDE3E2] cursor-pointer transition text-center"
          >
            {currentLang === 'gu' ? 'બંધ કરો' : currentLang === 'hi' ? 'बंद करें' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
