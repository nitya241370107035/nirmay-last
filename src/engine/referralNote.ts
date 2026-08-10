import { Patient, CaseData, DiagnosisResult, RiskLevel, LanguageCode } from '../types';

export interface ReferralNoteInput {
  patient: Patient | null | undefined;
  caseData: CaseData;
  diagnosis: DiagnosisResult;
  medicinesGiven?: (string | { name: { en: string; hi: string; gu: string } | string })[];
  risk?: RiskLevel;
  lang?: LanguageCode;
}

export function generateReferralText(input: ReferralNoteInput): string {
  const { patient, caseData, diagnosis, medicinesGiven = [], lang = 'en' } = input;
  const risk = input.risk || caseData.risk || diagnosis.primaryDisease?.base_urgency || 'orange';

  const dateStr = new Date().toLocaleString(
    lang === 'gu' ? 'gu-IN' : lang === 'hi' ? 'hi-IN' : 'en-IN',
    {
      dateStyle: 'medium',
      timeStyle: 'short',
    }
  );

  const notRecorded = lang === 'gu' ? 'નોંધાયેલ નથી' : lang === 'hi' ? 'दर्ज नहीं' : 'Not recorded';

  // 1. Patient Info
  const patientName = patient?.name || caseData.patientName || notRecorded;
  const ageVal = patient?.age || caseData.age || caseData.age_group || notRecorded;
  const ageDisplay = typeof ageVal === 'number' ? `${ageVal} ${lang === 'gu' ? 'વર્ષ' : lang === 'hi' ? 'वर्ष' : 'years'}` : ageVal;
  const gender = patient?.gender || caseData.gender || notRecorded;
  const village = patient?.village || caseData.village || notRecorded;

  // 2. Case Info
  const chiefComplaint = caseData.chief_complaint || notRecorded;
  const duration = caseData.duration || notRecorded;
  const symptomsList = caseData.additional_symptoms && caseData.additional_symptoms.length > 0
    ? caseData.additional_symptoms.join(', ')
    : caseData.symptoms && caseData.symptoms.length > 0
    ? caseData.symptoms.join(', ')
    : notRecorded;

  // Risk Label
  let riskLabel = '';
  if (risk === 'red') {
    riskLabel = lang === 'gu' ? 'અત્યાવશ્યક (લાલ / Red Emergency)' : lang === 'hi' ? 'आपातकालीन (लाल / Red Emergency)' : 'EMERGENCY (Red)';
  } else if (risk === 'orange') {
    riskLabel = lang === 'gu' ? 'તાત્કાલિક (ઓરેન્જ / Orange Urgent)' : lang === 'hi' ? 'गंभीर (ऑरेंज / Orange Urgent)' : 'URGENT (Orange)';
  } else {
    riskLabel = lang === 'gu' ? 'સામાન્ય (લીલો / Green Routine)' : lang === 'hi' ? 'सामान्य (हरा / Green Routine)' : 'ROUTINE (Green)';
  }

  // 3. Vitals
  const vitalsObj = (typeof caseData.vitals === 'object' && !Array.isArray(caseData.vitals)) ? caseData.vitals as Record<string, any> : {};
  const bp = vitalsObj.bp || caseData.bp || (caseData.systolic && caseData.diastolic ? `${caseData.systolic}/${caseData.diastolic} mmHg` : null);
  const spo2 = vitalsObj.spo2 || caseData.spo2 || caseData.oxygen ? `${vitalsObj.spo2 || caseData.spo2 || caseData.oxygen}%` : null;
  const temp = vitalsObj.temperature || caseData.temperature ? `${vitalsObj.temperature || caseData.temperature} °C` : null;
  const pulse = vitalsObj.pulse || caseData.pulse || caseData.heart_rate ? `${vitalsObj.pulse || caseData.pulse || caseData.heart_rate} bpm` : null;
  const rr = vitalsObj.respiratory_rate || caseData.respiratory_rate ? `${vitalsObj.respiratory_rate || caseData.respiratory_rate} /min` : null;
  const sugar = vitalsObj.blood_sugar || caseData.blood_glucose ? `${vitalsObj.blood_sugar || caseData.blood_glucose} mg/dL` : null;

  const vitalsEntered = bp || spo2 || temp || pulse || rr || sugar;

  // 4. Diagnosis
  const primaryName = diagnosis?.primaryDisease?.name?.[lang] || diagnosis?.primaryName || notRecorded;
  const differentials = diagnosis?.differentialDiagnoses
    ? diagnosis.differentialDiagnoses
        .filter((d) => d.id !== diagnosis.primaryDiseaseId)
        .map((d) => d.disease?.name?.[lang] || d.name)
        .join(', ')
    : '';

  // 5. Medicines
  const medsFormatted: string[] = [];
  if (Array.isArray(medicinesGiven) && medicinesGiven.length > 0) {
    medicinesGiven.forEach((m) => {
      if (typeof m === 'string') {
        medsFormatted.push(m);
      } else if (m && typeof m === 'object' && m.name) {
        if (typeof m.name === 'string') {
          medsFormatted.push(m.name);
        } else {
          medsFormatted.push(m.name[lang] || m.name.en || '');
        }
      }
    });
  }

  const medsText = medsFormatted.length > 0
    ? medsFormatted.map((m) => `- ${m}`).join('\n')
    : (lang === 'gu' ? 'કોઈ દવા આપેલ નથી' : lang === 'hi' ? 'कोई दवा नहीं दी गई' : 'None given');

  // 6. Advice
  let adviceText = '';
  if (risk === 'red') {
    adviceText = lang === 'gu'
      ? 'અત્યાવશ્યક રિફરલ: CHC / ડિસ્ટ્રિક્ટ હોસ્પિટલમાં તાત્કાલિક ટ્રાન્સફર જરૂરી. તરત જ 108 એમ્બ્યુલન્સ બોલાવો. શ્વાસમાર્ગ ખુલ્લો રાખો, દર્દીને હૂંફાળા રાખો અને દર ૧૫ મિનિટે વાઇટલ્સ ચકાસો.'
      : lang === 'hi'
      ? 'आपातकालीन रेफरल: सीएचसी / जिला अस्पताल में तत्काल स्थानांतरण आवश्यक है। तुरंत 108 एम्बुलेंस बुलाएं। वायुमार्ग खुला रखें, रोगी को गर्म रखें, हर 15 मिनट में वाइटल्स की निगरानी करें।'
      : 'EMERGENCY REFERRAL: Immediate transfer required to CHC / District Hospital. Call 108 Ambulance immediately. Maintain open airway, keep patient warm, monitor vital signs every 15 minutes, and ensure accompanied transport.';
  } else if (risk === 'orange') {
    adviceText = lang === 'gu'
      ? 'તાત્કાલિક રિફરલ: વધુ તપાસ માટે ૨૪ કલાકમાં નજીકના PHC / CHC પર રિફર કરો. દર્દીને પૂરતું પાણી/પ્રવાહી આપો અને લક્ષણોની દેખરેખ રાખો.'
      : lang === 'hi'
      ? 'गंभीर रेफरल: विस्तृत चिकित्सा मूल्यांकन के लिए 24 घंटे के भीतर नजदीकी पीएचसी / सीएचसी में भेजें। जलयोजन बनाए रखें और गंभीर लक्षणों पर नज़र रखें।'
      : 'URGENT REFERRAL: Refer to nearest PHC / CHC within 24 hours for further medical evaluation. Maintain hydration, monitor symptoms, and instruct family to watch for danger signs.';
  } else {
    adviceText = lang === 'gu'
      ? 'સામાન્ય સલાહ: આપેલ સૂચના મુજબ ઘરેલું સંભાળ અને દવાનો કોર્સ ચાલુ રાખો. જો ૩ દિવસ પછી પણ રાહત ન થાય તો તબીબી અધિકારીની સલાહ લો.'
      : lang === 'hi'
      ? 'सामान्य सलाह: सलाह के अनुसार घरेलू देखभाल और निर्धारित दवाएं जारी रखें। यदि लक्षण 3 दिनों से अधिक समय तक बने रहते हैं, तो चिकित्सा अधिकारी से परामर्श करें।'
      : 'ROUTINE REFERRAL / ADVICE: Continue home care and prescribed medications as advised. If symptoms persist beyond 3 days or new warning signs appear, consult a medical officer.';
  }

  // Formatting plain text block
  if (lang === 'gu') {
    return `============================================
        રિફરલ નોટ – નિરામય (NIRĀMAY)
============================================
તારીખ: ${dateStr}

દર્દીની વિગતો (PATIENT DETAILS)
નામ:      ${patientName}
ઉંમર:     ${ageDisplay}   જાતિ: ${gender}
ગામ:      ${village}

કેસ સારાંશ (CASE SUMMARY)
મુખ્ય ફરિયાદ: ${chiefComplaint}
સમયગાળો:    ${duration}
લક્ષણો:      ${symptomsList}
જોખમ સ્તર:   ${riskLabel}

વાઇટલ સંકેતો (VITAL SIGNS)
${vitalsEntered ? `BP:           ${bp || notRecorded}
SpO2:         ${spo2 || notRecorded}
તાપમાન:       ${temp || notRecorded}
પલ્સ Rate:    ${pulse || notRecorded}
શ્વસન દર (RR): ${rr || notRecorded}
બ્લડ સુગર:    ${sugar || notRecorded}` : notRecorded}

શંકાસ્પદ નિદાન (SUSPECTED DIAGNOSIS)
પ્રાથમિક નિદાન: ${primaryName}
${differentials ? `અન્ય શક્યતાઓ: ${differentials}` : ''}

અગાઉ આપેલ દવાઓ (MEDICINES ALREADY GIVEN)
${medsText}

ક્લિનિકલ સલાહ (ADVICE)
${adviceText}

------------------------------------------------
Generated by Nirāmay – Virtual Village Clinic
This note is for clinical communication only.`;
  }

  if (lang === 'hi') {
    return `============================================
        रेफरल नोट – निरामय (NIRĀMAY)
============================================
दिनांक: ${dateStr}

रोगी विवरण (PATIENT DETAILS)
नाम:      ${patientName}
आयु:      ${ageDisplay}   लिंग: ${gender}
गाँव:     ${village}

मामला सारांश (CASE SUMMARY)
मुख्य शिकायत: ${chiefComplaint}
अवधि:        ${duration}
लक्षण:        ${symptomsList}
जोखिम स्तर:   ${riskLabel}

वाइटल संकेत (VITAL SIGNS)
${vitalsEntered ? `BP:           ${bp || notRecorded}
SpO2:         ${spo2 || notRecorded}
तापमान:       ${temp || notRecorded}
हृदय गति:     ${pulse || notRecorded}
श्वसन दर (RR): ${rr || notRecorded}
ब्लड शुगर:    ${sugar || notRecorded}` : notRecorded}

संदिग्ध निदान (SUSPECTED DIAGNOSIS)
प्राथमिक निदान: ${primaryName}
${differentials ? `अन्य संभावनाएँ: ${differentials}` : ''}

दी गई दवाएं (MEDICINES ALREADY GIVEN)
${medsText}

नैदानिक सलाह (ADVICE)
${adviceText}

------------------------------------------------
Generated by Nirāmay – Virtual Village Clinic
This note is for clinical communication only.`;
  }

  // Default English
  return `============================================
        REFERRAL NOTE – NIRĀMAY
============================================
Date: ${dateStr}

PATIENT DETAILS
Name:     ${patientName}
Age:      ${ageDisplay}   Gender: ${gender}
Village:  ${village}

CASE SUMMARY
Chief Complaint: ${chiefComplaint}
Duration:        ${duration}
Symptoms:        ${symptomsList}
Risk Level:      ${riskLabel}

VITAL SIGNS
${vitalsEntered ? `BP:           ${bp || notRecorded}
SpO2:         ${spo2 || notRecorded}
Temperature:  ${temp || notRecorded}
Heart Rate:   ${pulse || notRecorded}
Resp. Rate:   ${rr || notRecorded}
Blood Sugar:  ${sugar || notRecorded}` : notRecorded}

SUSPECTED DIAGNOSIS
Primary:      ${primaryName}
${differentials ? `Also Consider: ${differentials}` : ''}

MEDICINES ALREADY GIVEN
${medsText}

CLINICAL ADVICE
${adviceText}

------------------------------------------------
Generated by Nirāmay – Virtual Village Clinic
This note is for clinical communication only.`;
}

export async function generateReferralPDF(input: ReferralNoteInput): Promise<Blob> {
  try {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const { patient, caseData, diagnosis, medicinesGiven = [], lang = 'en' } = input;
    const risk = input.risk || caseData.risk || diagnosis.primaryDisease?.base_urgency || 'orange';

    const notRecorded = 'Not recorded';
    const patientName = patient?.name || caseData.patientName || notRecorded;
    const ageVal = patient?.age || caseData.age || caseData.age_group || notRecorded;
    const gender = patient?.gender || caseData.gender || notRecorded;
    const village = patient?.village || caseData.village || notRecorded;

    const chiefComplaint = caseData.chief_complaint || notRecorded;
    const duration = caseData.duration || notRecorded;
    const symptomsList = caseData.additional_symptoms?.length
      ? caseData.additional_symptoms.join(', ')
      : caseData.symptoms?.length
      ? caseData.symptoms.join(', ')
      : notRecorded;

    const primaryName = diagnosis?.primaryDisease?.name?.en || diagnosis?.primaryName || notRecorded;
    const dateStr = new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

    // Background header bar (#1B4D4A)
    doc.setFillColor(27, 77, 74);
    doc.rect(0, 0, 210, 28, 'F');

    // Header Text
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('NIRAMAY - CLINICAL REFERRAL NOTE', 14, 18);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Date: ${dateStr}`, 14, 24);

    let y = 38;

    // PATIENT DETAILS SECTION
    doc.setFillColor(240, 248, 246);
    doc.rect(14, y - 4, 182, 28, 'F');
    doc.setDrawColor(46, 125, 115);
    doc.rect(14, y - 4, 182, 28, 'S');

    doc.setTextColor(27, 77, 74);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('PATIENT DETAILS', 18, y + 2);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(26, 43, 43);
    doc.text(`Name: ${patientName}`, 18, y + 9);
    doc.text(`Age: ${ageVal}   |   Gender: ${gender}`, 18, y + 15);
    doc.text(`Village: ${village}`, 18, y + 21);

    y += 34;

    // CASE SUMMARY & RISK
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(27, 77, 74);
    doc.text('CASE SUMMARY', 14, y);
    y += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(26, 43, 43);
    doc.text(`Chief Complaint: ${chiefComplaint}`, 14, y);
    y += 5;
    doc.text(`Duration: ${duration}`, 14, y);
    y += 5;
    doc.text(`Symptoms: ${symptomsList}`, 14, y);
    y += 6;

    // Risk Box
    const riskUpper = risk.toUpperCase();
    if (risk === 'red') {
      doc.setFillColor(254, 226, 226);
      doc.setDrawColor(220, 38, 38);
      doc.setTextColor(185, 28, 28);
    } else if (risk === 'orange') {
      doc.setFillColor(254, 243, 199);
      doc.setDrawColor(217, 119, 6);
      doc.setTextColor(180, 83, 9);
    } else {
      doc.setFillColor(209, 250, 229);
      doc.setDrawColor(16, 185, 129);
      doc.setTextColor(4, 120, 87);
    }

    doc.rect(14, y - 2, 182, 8, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.text(`RISK LEVEL: ${riskUpper}`, 18, y + 3.5);
    y += 14;

    // VITAL SIGNS
    const vitalsObj = (typeof caseData.vitals === 'object' && !Array.isArray(caseData.vitals)) ? caseData.vitals as Record<string, any> : {};
    const bp = vitalsObj.bp || caseData.bp || (caseData.systolic && caseData.diastolic ? `${caseData.systolic}/${caseData.diastolic} mmHg` : null);
    const spo2 = vitalsObj.spo2 || caseData.spo2 || caseData.oxygen ? `${vitalsObj.spo2 || caseData.spo2 || caseData.oxygen}%` : null;
    const temp = vitalsObj.temperature || caseData.temperature ? `${vitalsObj.temperature || caseData.temperature} °C` : null;
    const pulse = vitalsObj.pulse || caseData.pulse || caseData.heart_rate ? `${vitalsObj.pulse || caseData.pulse || caseData.heart_rate} bpm` : null;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(27, 77, 74);
    doc.text('VITAL SIGNS', 14, y);
    y += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(26, 43, 43);
    doc.text(`BP: ${bp || 'Not recorded'}   |   SpO2: ${spo2 || 'Not recorded'}   |   Temp: ${temp || 'Not recorded'}   |   Pulse: ${pulse || 'Not recorded'}`, 14, y);
    y += 12;

    // SUSPECTED DIAGNOSIS
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(27, 77, 74);
    doc.text('SUSPECTED DIAGNOSIS', 14, y);
    y += 6;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(26, 43, 43);
    doc.text(`Primary Diagnosis: ${primaryName}`, 14, y);
    y += 10;

    // MEDICINES GIVEN
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(27, 77, 74);
    doc.text('MEDICINES ALREADY GIVEN', 14, y);
    y += 6;

    const medsFormatted: string[] = [];
    if (Array.isArray(medicinesGiven) && medicinesGiven.length > 0) {
      medicinesGiven.forEach((m) => {
        if (typeof m === 'string') {
          medsFormatted.push(m);
        } else if (m && typeof m === 'object' && m.name) {
          medsFormatted.push(typeof m.name === 'string' ? m.name : m.name.en || '');
        }
      });
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    if (medsFormatted.length > 0) {
      medsFormatted.forEach((med) => {
        doc.text(`• ${med}`, 18, y);
        y += 5;
      });
    } else {
      doc.text('• None given', 18, y);
      y += 5;
    }
    y += 6;

    // Dotted Separator
    doc.setLineWidth(0.3);
    doc.setDrawColor(150, 150, 150);
    doc.setLineDashPattern([1, 1], 0);
    doc.line(14, y, 196, y);
    doc.setLineDashPattern([], 0); // reset line dash
    y += 8;

    // ADVICE
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(27, 77, 74);
    doc.text('CLINICAL ADVICE & INSTRUCTIONS', 14, y);
    y += 6;

    let adviceText = '';
    if (risk === 'red') {
      adviceText = 'EMERGENCY REFERRAL: Immediate transfer required to CHC / District Hospital. Call 108 Ambulance immediately. Maintain open airway, keep patient warm, monitor vital signs every 15 minutes, and ensure accompanied transport.';
    } else if (risk === 'orange') {
      adviceText = 'URGENT REFERRAL: Refer to nearest PHC / CHC within 24 hours for further medical evaluation. Maintain hydration, monitor symptoms, and instruct family to watch for danger signs.';
    } else {
      adviceText = 'ROUTINE REFERRAL / ADVICE: Continue home care and prescribed medications as advised. If symptoms persist beyond 3 days or new warning signs appear, consult a medical officer.';
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(26, 43, 43);
    const splitAdvice = doc.splitTextToSize(adviceText, 180);
    doc.text(splitAdvice, 14, y);
    y += splitAdvice.length * 5 + 10;

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text('Generated by Nirāmay – Virtual Village Clinic. This note is for clinical communication only.', 14, 280);

    return doc.output('blob');
  } catch (err) {
    console.error('PDF generation error:', err);
    throw err;
  }
}
