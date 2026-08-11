import { LanguageCode } from '../types';

export interface TranslationDictionary {
  // Navigation & Clinic Tabs
  triageStationTab: string;
  emrRecordsTab: string;
  doctorStationTab: string;
  appointmentsTab: string;
  outbreakSentinelTab: string;
  newPatient: string;
  editClinic: string;
  switchPortal: string;
  
  // Demographics & Registration
  patientRegistrationTitle: string;
  patientNameLabel: string;
  patientNamePlaceholder: string;
  ageLabel: string;
  genderLabel: string;
  male: string;
  female: string;
  phoneLabel: string;
  phonePlaceholder: string;
  uhidLabel: string;
  villageCityLabel: string;
  
  // Vitals
  mandatoryVitalsTitle: string;
  heartRate: string;
  spo2: string;
  bloodPressure: string;
  bodyTemp: string;
  height: string;
  weight: string;
  derivedBmi: string;
  normal: string;
  critical: string;
  normalRangeHeartRate: string;
  normalRangeSpO2: string;
  normalRangeBP: string;
  normalRangeTemp: string;
  
  // Stepper
  step1: string;
  step2: string;
  step3: string;
  step4: string;
  proceedToChiefComplaint: string;
  back: string;
  
  // Chief Complaint
  chiefComplaintTitle: string;
  chiefComplaintDesc: string;
  searchComplaints: string;
  feverComplaint: string;
  coughComplaint: string;
  chestPainComplaint: string;
  breathlessnessComplaint: string;
  abdominalPainComplaint: string;
  dizzinessComplaint: string;
  vomitingComplaint: string;
  headacheComplaint: string;
  diarrheaComplaint: string;
  startAdaptiveQuestions: string;
  
  // Dynamic Inquiry
  dynamicInquiryTitle: string;
  questionNumber: string;
  yes: string;
  no: string;
  unknown: string;
  calculatingTriage: string;
  
  // Triage Result
  triageDecisionTitle: string;
  predictedRisk: string;
  highRisk: string;
  mediumRisk: string;
  lowRisk: string;
  confidenceScore: string;
  clinicalFlags: string;
  actionDirective: string;
  printSlip: string;
  openInDoctorStation: string;
  intakeNextPatient: string;
  
  // Doctor Station
  doctorConsultationTitle: string;
  doctorConsultationSubtitle: string;
  directDoctorConsult: string;
  consultAndPrescribe: string;
  searchRecordsPlaceholder: string;
  allRecords: string;
  waitingDoctor: string;
  inConsultation: string;
  completed: string;
  highRiskFilter: string;
  provisionalDiagnosis: string;
  finalDiagnosis: string;
  doctorNotes: string;
  rxTitle: string;
  medicineName: string;
  dosage: string;
  timing: string;
  durationDays: string;
  foodInstruction: string;
  afterFood: string;
  beforeFood: string;
  withFood: string;
  emptyStomach: string;
  addToRx: string;
  saveClinicalRecord: string;
  cancel: string;
  advisedLabTests: string;
  officialStamp: string;
  doctorSignature: string;
  
  // EMR Records Station
  emrIntakeTitle: string;
  emrIntakeSubtitle: string;
  addPatientRecordManual: string;
  sendToDoctor: string;
  saveToEMR: string;
  sourceManual: string;
  sourceMLTriage: string;
  sourceOnlineBooking: string;
  
  // Appointments Desk & Booking
  appointmentsDeskTitle: string;
  appointmentsDeskSubtitle: string;
  refreshQueue: string;
  searchAppointmentsPlaceholder: string;
  pendingReview: string;
  confirmedSlots: string;
  cancelled: string;
  confirmSlot: string;
  intakeAndStartTriage: string;
  markCompleted: string;
  reasonForConsultation: string;
  preferredDate: string;
  assignedSlot: string;
  bookAppointmentBannerTitle: string;
  bookAppointmentBannerSubtitle: string;
  bookAppointmentModalTitle: string;
  bookAppointmentModalSubtitle: string;
  chooseEnrolledClinic: string;
  departmentSpecialty: string;
  submitBookingRequest: string;
  bookingSuccessTitle: string;
  bookingSuccessDesc: string;
  myAppointmentsTitle: string;
  myAppointmentsSubtitle: string;
  bookNewAppointment: string;
  noAppointmentsFound: string;
  
  // Portal Selector
  selectPortalTitle: string;
  selectPortalSubtitle: string;
  communityPortalCardTitle: string;
  communityPortalCardDesc: string;
  clinicPortalCardTitle: string;
  clinicPortalCardDesc: string;
  enterCommunityPortal: string;
  enterClinicPortal: string;
}

export const CLINICAL_TRANSLATIONS: Record<LanguageCode, TranslationDictionary> = {
  gu: {
    // Navigation & Clinic Tabs
    triageStationTab: 'ટ્રાયજ સ્ટેશન (ML તપાસ)',
    emrRecordsTab: 'ડિજિટલ EMR રેકોર્ડ્સ',
    doctorStationTab: 'ડૉક્ટર કન્સલ્ટેશન અને Rx',
    appointmentsTab: 'એપોઇન્ટમેન્ટ ડેસ્ક',
    outbreakSentinelTab: 'રોગચાળો મોનિટરિંગ (Sentinel)',
    newPatient: 'નવો દર્દી',
    editClinic: 'ક્લિનિક વિગત',
    switchPortal: 'પોર્ટલ બદલો',

    // Demographics & Registration
    patientRegistrationTitle: 'દર્દી નોંધણી અને વિગત',
    patientNameLabel: 'દર્દીનું પૂરું નામ *',
    patientNamePlaceholder: 'દા.ત. રમેશભાઈ પટેલ',
    ageLabel: 'ઉંમર (વર્ષ) *',
    genderLabel: 'જાતિ *',
    male: 'પુરુષ',
    female: 'સ્ત્રી',
    phoneLabel: 'મોબાઇલ નંબર',
    phonePlaceholder: 'દા.ત. +91 98765 43210',
    uhidLabel: 'UHID / હોસ્પિટલ નંબર',
    villageCityLabel: 'ગામ / શહેર',

    // Vitals
    mandatoryVitalsTitle: 'ફરજિયાત ક્લિનિકલ વાઇટલ્સ',
    heartRate: 'હૃદયના ધબકારા (પલ્સ)',
    spo2: 'ઓક્સિજન સ્તર (SpO2)',
    bloodPressure: 'બ્લડ પ્રેશર (BP)',
    bodyTemp: 'શરીરનું તાપમાન',
    height: 'ઊંચાઈ (સેમી)',
    weight: 'વજન (કિગ્રા)',
    derivedBmi: 'ગણતરી કરેલ BMI',
    normal: 'સામાન્ય',
    critical: 'ગંભીર',
    normalRangeHeartRate: 'સામાન્ય: ૬૦ - ૧૦૦ bpm',
    normalRangeSpO2: 'સામાન્ય: ૯૫ - ૧૦૦% (ગંભીર: <૯૦%)',
    normalRangeBP: 'સામાન્ય: ૧૨૦ / ૮૦ mmHg',
    normalRangeTemp: 'સામાન્ય: ૩૬.૫ - ૩૭.૫ °C (૯૭.૭ - ૯૯.૫ °F)',

    // Stepper
    step1: '૧. વાઇટલ્સ અને દર્દી વિગત',
    step2: '૨. મુખ્ય તકલીફ',
    step3: '૩. લક્ષણ પ્રશ્નાવલી',
    step4: '૪. ટ્રાયજ નિર્ણય',
    proceedToChiefComplaint: 'મુખ્ય તકલીફ તરફ આગળ વધો →',
    back: '← પાછા જાઓ',

    // Chief Complaint
    chiefComplaintTitle: 'મુખ્ય તકલીફ પસંદ કરો',
    chiefComplaintDesc: 'દર્દી જે પ્રાથમિક લક્ષણ સાથે આવ્યા છે તે પસંદ કરો જેથી સંલગ્ન AI પ્રશ્નો પૂછી શકાય.',
    searchComplaints: 'મુખ્ય તકલીફ શોધો...',
    feverComplaint: 'તાવ અને ધ્રુજારી (Fever / Chills)',
    coughComplaint: 'ઉધરસ અને કફ (Cough / Phlegm)',
    chestPainComplaint: 'છાતીમાં દુખાવો અને ભીંસ (Chest Pain / Pressure)',
    breathlessnessComplaint: 'શ્વાસ લેવામાં તકલીફ (Shortness of Breath)',
    abdominalPainComplaint: 'પેટમાં તીવ્ર દુખાવો (Abdominal Pain / Cramps)',
    dizzinessComplaint: 'ચક્કર અને નબળાઈ (Dizziness / Vertigo)',
    vomitingComplaint: 'ઊલટી અને ઉબકા (Nausea / Vomiting)',
    headacheComplaint: 'માથાનો સખત દુખાવો (Severe Headache)',
    diarrheaComplaint: 'ઝાડા અને ડિહાઇડ્રેશન (Diarrhea / Loose Stools)',
    startAdaptiveQuestions: 'સ્માર્ટ પ્રશ્નાવલી શરૂ કરો →',

    // Dynamic Inquiry
    dynamicInquiryTitle: 'AI અનુકૂલિત ક્લિનિકલ પ્રશ્નાવલી',
    questionNumber: 'પ્રશ્ન',
    yes: 'હા',
    no: 'ના',
    unknown: 'ખબર નથી',
    calculatingTriage: '૧.૫ લાખ કેસોના મોડેલ દ્વારા ટ્રાયજ વિશ્લેષણ થઈ રહ્યું છે...',

    // Triage Result
    triageDecisionTitle: 'ક્લિનિકલ ટ્રાયજ નિર્ણય અને વર્ગીકરણ',
    predictedRisk: 'આગાહી કરેલ જોખમ સ્તર',
    highRisk: 'ઉચ્ચ જોખમ (High Risk Emergency)',
    mediumRisk: 'મધ્યમ જોખમ (Medium Risk Urgent)',
    lowRisk: 'ઓછું જોખમ (Low Risk Routine)',
    confidenceScore: 'મોડેલ વિશ્વસનીયતા',
    clinicalFlags: 'ક્લિનિકલ ચેતવણીઓ',
    actionDirective: 'ભલામણ કરેલ તબીબી પગલાં',
    printSlip: 'ક્લિનિકલ સ્લિપ પ્રિન્ટ કરો',
    openInDoctorStation: 'ડૉક્ટર સ્ટેશનમાં ખોલો (EMR અને દવાઓ) →',
    intakeNextPatient: 'આગામી દર્દી દાખલ કરો',

    // Doctor Station
    doctorConsultationTitle: 'ડૉક્ટર કન્સલ્ટેશન અને પ્રિસ્ક્રિપ્શન સ્ટેશન',
    doctorConsultationSubtitle: 'દર્દીના EMR રેકોર્ડ્સ જુઓ, તપાસ કરો, નિદાન નોંધો અને ડિજિટલ દવાઓ (Rx) લખો.',
    directDoctorConsult: '+ સીધું ડૉક્ટર કન્સલ્ટેશન',
    consultAndPrescribe: 'તપાસો અને Rx લખો',
    searchRecordsPlaceholder: 'દર્દીનું નામ, UHID, ફોન અથવા નિદાન દ્વારા શોધો...',
    allRecords: 'બધા રેકોર્ડ્સ',
    waitingDoctor: 'ડૉક્ટરની રાહ જોતા',
    inConsultation: 'તપાસ ચાલુ છે',
    completed: 'પૂર્ણ થયેલ',
    highRiskFilter: 'ઉચ્ચ જોખમ વાળા દર્દીઓ',
    provisionalDiagnosis: 'કાચું નિદાન (Provisional Diagnosis)',
    finalDiagnosis: 'અંતિમ નિદાન (Final Diagnosis)',
    doctorNotes: 'ડૉક્ટરની તપાસ નોંધ અને સૂચનાઓ',
    rxTitle: 'ડિજિટલ પ્રિસ્ક્રિપ્શન (Rx)',
    medicineName: 'દવાનું નામ',
    dosage: 'ડોઝ (પ્રમાણ)',
    timing: 'સમય',
    durationDays: 'દિવસો',
    foodInstruction: 'જમવાની સૂચના',
    afterFood: 'જમ્યા પછી',
    beforeFood: 'જમ્યા પહેલાં',
    withFood: 'જમવાની સાથે',
    emptyStomach: 'ખાલી પેટે',
    addToRx: '+ પ્રિસ્ક્રિપ્શનમાં ઉમેરો',
    saveClinicalRecord: 'ડિજિટલ રેકોર્ડ સાચવો',
    cancel: 'રદ કરો',
    advisedLabTests: 'સૂચવેલ લેબ ટેસ્ટ:',
    officialStamp: 'સત્તાવાર સિક્કો',
    doctorSignature: 'ડૉક્ટરની સહી અને સિક્કો',

    // EMR Records Station
    emrIntakeTitle: 'ડિજિટલ ક્લિનિકલ રેકોર્ડ્સ (EMR)',
    emrIntakeSubtitle: 'દર્દીઓની વિગત મેન્યુઅલ દાખલ કરો, વાઇટલ્સ નોંધો અને તમામ ડિજિટલ હેલ્થ રેકોર્ડ્સનું સંચાલન કરો.',
    addPatientRecordManual: '+ નવો દર્દી રેકોર્ડ ઉમેરો (મેન્યુઅલ)',
    sendToDoctor: 'ડૉક્ટર પાસે મોકલો',
    saveToEMR: 'EMR માં સાચવો',
    sourceManual: 'મેન્યુઅલ નોંધણી',
    sourceMLTriage: 'ML ટ્રાયજ',
    sourceOnlineBooking: 'ઓનલાઇન બુકિંગ',

    // Appointments Desk & Booking
    appointmentsDeskTitle: 'ઓનલાઇન એપોઇન્ટમેન્ટ મેનેજર',
    appointmentsDeskSubtitle: 'નાગરિકોની ઓનલાઇન બુકિંગ વિનંતીઓ તપાસો, સમય સ્લોટ આપો અને દર્દી આવે ત્યારે ટ્રાયજ શરૂ કરો.',
    refreshQueue: 'કતાર રિફ્રેશ કરો',
    searchAppointmentsPlaceholder: 'દર્દીનું નામ, ID, ફોન અથવા કારણ દ્વારા શોધો...',
    pendingReview: 'બાકી સમીક્ષા',
    confirmedSlots: 'મંજૂર સ્લોટ્સ',
    cancelled: 'રદ થયેલ',
    confirmSlot: 'સ્લોટ મંજૂર કરો',
    intakeAndStartTriage: 'દાખલ કરો અને ટ્રાયજ શરૂ કરો',
    markCompleted: 'પૂર્ણ જાહેર કરો',
    reasonForConsultation: 'મુલાકાતનું કારણ',
    preferredDate: 'પસંદગીની તારીખ',
    assignedSlot: 'ફાળવેલ સમય સ્લોટ',
    bookAppointmentBannerTitle: 'ક્લિનિક અને OPD એપોઇન્ટમેન્ટ બુક કરો',
    bookAppointmentBannerSubtitle: 'આણંદ PHC, સિવિલ હોસ્પિટલ અને CHC માં કન્સલ્ટેશન સ્લોટ રિઝર્વ કરો',
    bookAppointmentModalTitle: 'ક્લિનિક અને હોસ્પિટલ એપોઇન્ટમેન્ટ બુકિંગ',
    bookAppointmentModalSubtitle: 'સરકારી અને નોંધાયેલ આરોગ્ય કેન્દ્રોમાં ડાયરેક્ટ OPD સ્લોટ રિઝર્વેશન',
    chooseEnrolledClinic: 'નોંધાયેલ ક્લિનિક / હોસ્પિટલ પસંદ કરો *',
    departmentSpecialty: 'વિભાગ / વિશેષતા *',
    submitBookingRequest: 'એપોઇન્ટમેન્ટ વિનંતી સબમિટ કરો',
    bookingSuccessTitle: 'એપોઇન્ટમેન્ટ વિનંતી સફળતાપૂર્વક મોકલાઈ!',
    bookingSuccessDesc: 'તમારી એપોઇન્ટમેન્ટ વિનંતી સબમિટ થઈ ગઈ છે. ક્લિનિક રિસેપ્શન ટૂંક સમયમાં તમારો સમય સ્લોટ મંજૂર કરશે.',
    myAppointmentsTitle: 'મારી ક્લિનિક અને OPD એપોઇન્ટમેન્ટ્સ',
    myAppointmentsSubtitle: 'સમુદાય અને સરકારી ક્લિનિક્સમાં માંગેલ કન્સલ્ટેશનની લાઈવ સ્થિતિ',
    bookNewAppointment: '+ નવી એપોઇન્ટમેન્ટ બુક કરો',
    noAppointmentsFound: 'હજુ સુધી કોઈ એપોઇન્ટમેન્ટ બુક કરવામાં આવી નથી.',

    // Portal Selector
    selectPortalTitle: 'નિરામય ડિજિટલ હેલ્થ પ્લેટફોર્મ',
    selectPortalSubtitle: 'તમારી જરૂરિયાત મુજબ પોર્ટલ પસંદ કરો:',
    communityPortalCardTitle: 'નાગરિક અને પરિવાર હેલ્થ પોર્ટલ',
    communityPortalCardDesc: 'પરિવાર આરોગ્ય રજિસ્ટર, દવા પાલન રિમાઇન્ડર, લક્ષણ તપાસ અને ઓનલાઇન ક્લિનિક એપોઇન્ટમેન્ટ બુકિંગ.',
    clinicPortalCardTitle: 'ક્લિનિક અને હોસ્પિટલ સ્માર્ટ પોર્ટલ',
    clinicPortalCardDesc: '૧.૫ લાખ કેસોનું ML ટ્રાયજ એન્જિન, ડિજિટલ પેપરલેસ EMR, ડૉક્ટર કન્સલ્ટેશન ડેસ્ક અને ડિજિટલ પ્રિસ્ક્રિપ્શન.',
    enterCommunityPortal: 'પરિવાર પોર્ટલમાં પ્રવેશો →',
    enterClinicPortal: 'ક્લિનિકલ પોર્ટલમાં પ્રવેશો →'
  },

  hi: {
    // Navigation & Clinic Tabs
    triageStationTab: 'ट्राइएज स्टेशन (ML जांच)',
    emrRecordsTab: 'डिजिटल EMR रिकॉर्ड्स',
    doctorStationTab: 'डॉक्टर परामर्श एवं Rx',
    appointmentsTab: 'अपॉइंटमेंट डेस्क',
    outbreakSentinelTab: 'प्रकोप निगरानी (Sentinel)',
    newPatient: 'नया मरीज',
    editClinic: 'क्लिनिक विवरण',
    switchPortal: 'पोर्टल बदलें',

    // Demographics & Registration
    patientRegistrationTitle: 'मरीज पंजीकरण एवं विवरण',
    patientNameLabel: 'मरीज का पूरा नाम *',
    patientNamePlaceholder: 'उदा. रमेश पटेल',
    ageLabel: 'आयु (वर्ष) *',
    genderLabel: 'लिंग *',
    male: 'पुरुष',
    female: 'महिला',
    phoneLabel: 'मोबाइल नंबर',
    phonePlaceholder: 'उदा. +91 98765 43210',
    uhidLabel: 'UHID / अस्पताल संख्या',
    villageCityLabel: 'गांव / शहर',

    // Vitals
    mandatoryVitalsTitle: 'अनिवार्य क्लिनिकल वाइटल्स',
    heartRate: 'हृदय गति (पल्स)',
    spo2: 'ऑक्सीजन स्तर (SpO2)',
    bloodPressure: 'रक्तचाप (BP)',
    bodyTemp: 'शरीर का तापमान',
    height: 'ऊंचाई (सेमी)',
    weight: 'वजन (किग्रा)',
    derivedBmi: 'गणना किया गया BMI',
    normal: 'सामान्य',
    critical: 'गंभीर',
    normalRangeHeartRate: 'सामान्य: 60 - 100 bpm',
    normalRangeSpO2: 'सामान्य: 95 - 100% (गंभीर: <90%)',
    normalRangeBP: 'सामान्य: 120 / 80 mmHg',
    normalRangeTemp: 'सामान्य: 36.5 - 37.5 °C (97.7 - 99.5 °F)',

    // Stepper
    step1: '१. वाइटल्स एवं मरीज विवरण',
    step2: '२. मुख्य समस्या',
    step3: '३. लक्षण प्रश्नावली',
    step4: '४. ट्राइएज परिणाम',
    proceedToChiefComplaint: 'मुख्य समस्या की ओर बढ़ें →',
    back: '← पीछे जाएं',

    // Chief Complaint
    chiefComplaintTitle: 'मुख्य समस्या चुनें',
    chiefComplaintDesc: 'मरीज जिस प्राथमिक लक्षण के साथ आया है उसे चुनें ताकि संबंधित AI प्रश्न पूछे जा सकें।',
    searchComplaints: 'मुख्य समस्या खोजें...',
    feverComplaint: 'बुखार एवं कंपकंपी (Fever / Chills)',
    coughComplaint: 'खांसी एवं कफ (Cough / Phlegm)',
    chestPainComplaint: 'सीने में दर्द एवं दबाव (Chest Pain / Pressure)',
    breathlessnessComplaint: 'सांस लेने में तकलीफ (Shortness of Breath)',
    abdominalPainComplaint: 'पेट में तेज दर्द (Abdominal Pain / Cramps)',
    dizzinessComplaint: 'चक्कर एवं कमजोरी (Dizziness / Vertigo)',
    vomitingComplaint: 'उल्टी एवं मतली (Nausea / Vomiting)',
    headacheComplaint: 'तेज सिरदर्द (Severe Headache)',
    diarrheaComplaint: 'दस्त एवं निर्जलीकरण (Diarrhea / Loose Stools)',
    startAdaptiveQuestions: 'स्मार्ट प्रश्नावली शुरू करें →',

    // Dynamic Inquiry
    dynamicInquiryTitle: 'AI अनुकूलित क्लिनिकल प्रश्नावली',
    questionNumber: 'प्रश्न',
    yes: 'हाँ',
    no: 'नहीं',
    unknown: 'पता नहीं',
    calculatingTriage: '1.5 लाख मामलों के मॉडल द्वारा ट्राइएज विश्लेषण हो रहा है...',

    // Triage Result
    triageDecisionTitle: 'क्लिनिकल ट्राइएज निर्णय एवं वर्गीकरण',
    predictedRisk: 'पूर्वानुमानित जोखिम स्तर',
    highRisk: 'उच्च जोखिम (High Risk Emergency)',
    mediumRisk: 'मध्यम जोखिम (Medium Risk Urgent)',
    lowRisk: 'निम्न जोखिम (Low Risk Routine)',
    confidenceScore: 'मॉडल विश्वसनीयता',
    clinicalFlags: 'क्लिनिकल चेतावनियां',
    actionDirective: 'अनुशंसित चिकित्सा कदम',
    printSlip: 'क्लिनिकल पर्ची प्रिंट करें',
    openInDoctorStation: 'डॉक्टर स्टेशन में खोलें (EMR और दवाएं) →',
    intakeNextPatient: 'अगला मरीज भर्ती करें',

    // Doctor Station
    doctorConsultationTitle: 'डॉक्टर परामर्श एवं प्रिस्क्रिप्शन स्टेशन',
    doctorConsultationSubtitle: 'मरीज के EMR रिकॉर्ड देखें, जांच करें, निदान दर्ज करें और डिजिटल दवाएं (Rx) लिखें।',
    directDoctorConsult: '+ सीधा डॉक्टर परामर्श',
    consultAndPrescribe: 'जांचें एवं Rx लिखें',
    searchRecordsPlaceholder: 'मरीज का नाम, UHID, फोन या निदान से खोजें...',
    allRecords: 'सभी रिकॉर्ड',
    waitingDoctor: 'डॉक्टर की प्रतीक्षा',
    inConsultation: 'परामर्श जारी',
    completed: 'पूर्ण',
    highRiskFilter: 'उच्च जोखिम वाले मरीज',
    provisionalDiagnosis: 'अनंतिम निदान (Provisional Diagnosis)',
    finalDiagnosis: 'अंतिम निदान (Final Diagnosis)',
    doctorNotes: 'डॉक्टर की जांच टिप्पणी एवं निर्देश',
    rxTitle: 'डिजिटल प्रिस्क्रिप्शन (Rx)',
    medicineName: 'दवा का नाम',
    dosage: 'मात्रा (खुराक)',
    timing: 'समय',
    durationDays: 'दिन',
    foodInstruction: 'भोजन निर्देश',
    afterFood: 'भोजन के बाद',
    beforeFood: 'भोजन से पहले',
    withFood: 'भोजन के साथ',
    emptyStomach: 'खाली पेट',
    addToRx: '+ प्रिस्क्रिप्शन में जोड़ें',
    saveClinicalRecord: 'डिजिटल रिकॉर्ड सहेजें',
    cancel: 'रद्द करें',
    advisedLabTests: 'अनुशंसित लैब टेस्ट:',
    officialStamp: 'आधिकारिक मुहर',
    doctorSignature: 'डॉक्टर के हस्ताक्षर एवं मुहर',

    // EMR Records Station
    emrIntakeTitle: 'डिजिटल क्लिनिकल रिकॉर्ड्स (EMR)',
    emrIntakeSubtitle: 'मरीजों का विवरण मैनुअल दर्ज करें, वाइटल्स रिकॉर्ड करें और सभी डिजिटल स्वास्थ्य रिकॉर्ड का प्रबंधन करें।',
    addPatientRecordManual: '+ नया मरीज रिकॉर्ड जोड़ें (मैनुअल)',
    sendToDoctor: 'डॉक्टर के पास भेजें',
    saveToEMR: 'EMR में सहेजें',
    sourceManual: 'मैनुअल पंजीकरण',
    sourceMLTriage: 'ML ट्राइएज',
    sourceOnlineBooking: 'ऑनलाइन बुकिंग',

    // Appointments Desk & Booking
    appointmentsDeskTitle: 'ऑनलाइन अपॉइंटमेंट प्रबंधक',
    appointmentsDeskSubtitle: 'नागरिकों के ऑनलाइन बुकिंग अनुरोध देखें, समय स्लॉट दें और मरीज आने पर ट्राइएज शुरू करें।',
    refreshQueue: 'कतार रीफ्रेश करें',
    searchAppointmentsPlaceholder: 'मरीज का नाम, ID, फोन या कारण से खोजें...',
    pendingReview: 'लंबित समीक्षा',
    confirmedSlots: 'स्वीकृत स्लॉट्स',
    cancelled: 'रद्द',
    confirmSlot: 'स्लॉट स्वीकृत करें',
    intakeAndStartTriage: 'भर्ती करें और ट्राइएज शुरू करें',
    markCompleted: 'पूर्ण चिह्नित करें',
    reasonForConsultation: 'परामर्श का कारण',
    preferredDate: 'पसंदीदा तिथि',
    assignedSlot: 'आवंटित समय स्लॉट',
    bookAppointmentBannerTitle: 'क्लिनिक एवं OPD अपॉइंटमेंट बुक करें',
    bookAppointmentBannerSubtitle: 'आणंद PHC, सिविल अस्पताल एवं CHC में परामर्श स्लॉट आरक्षित करें',
    bookAppointmentModalTitle: 'क्लिनिक एवं अस्पताल अपॉइंटमेंट बुकिंग',
    bookAppointmentModalSubtitle: 'सरकारी और पंजीकृत स्वास्थ्य केंद्रों में डायरेक्ट OPD स्लॉट आरक्षण',
    chooseEnrolledClinic: 'पंजीकृत क्लिनिक / अस्पताल चुनें *',
    departmentSpecialty: 'विभाग / विशेषता *',
    submitBookingRequest: 'अपॉइंटमेंट अनुरोध सबमिट करें',
    bookingSuccessTitle: 'अपॉइंटमेंट अनुरोध सफलतापूर्वक सबमिट हुआ!',
    bookingSuccessDesc: 'आपका अपॉइंटमेंट अनुरोध प्राप्त हो गया है। क्लिनिक रिसेप्शन जल्द ही आपका समय स्लॉट स्वीकृत करेगा।',
    myAppointmentsTitle: 'मेरी क्लिनिक एवं OPD अपॉइंटमेंट्स',
    myAppointmentsSubtitle: 'सामुदायिक एवं सरकारी क्लिनिकों में बुक किए गए परामर्शों की लाइव स्थिति',
    bookNewAppointment: '+ नई अपॉइंटमेंट बुक करें',
    noAppointmentsFound: 'अभी तक कोई अपॉइंटमेंट बुक नहीं की गई है।',

    // Portal Selector
    selectPortalTitle: 'निरामय डिजिटल स्वास्थ्य प्लेटफॉर्म',
    selectPortalSubtitle: 'अपनी आवश्यकतानुसार पोर्टल चुनें:',
    communityPortalCardTitle: 'नागरिक एवं पारिवारिक स्वास्थ्य पोर्टल',
    communityPortalCardDesc: 'पारिवारिक स्वास्थ्य रजिस्टर, दवा अनुपालन, लक्षण जांच एवं ऑनलाइन क्लिनिक अपॉइंटमेंट बुकिंग।',
    clinicPortalCardTitle: 'क्लिनिक एवं अस्पताल स्मार्ट पोर्टल',
    clinicPortalCardDesc: '1.5 लाख केसों का ML ट्राइएज इंजन, पेपरलेस डिजिटल EMR, डॉक्टर परामर्श डेस्क और डिजिटल प्रिस्क्रिप्शन।',
    enterCommunityPortal: 'पारिवारिक पोर्टल में प्रवेश करें →',
    enterClinicPortal: 'क्लिनिकल पोर्टल में प्रवेश करें →'
  },

  en: {
    // Navigation & Clinic Tabs
    triageStationTab: 'Triage Station (ML Intake)',
    emrRecordsTab: 'Digital EMR Records',
    doctorStationTab: 'Doctor Consultation & Rx',
    appointmentsTab: 'Appointments Desk',
    outbreakSentinelTab: 'Outbreak Sentinel',
    newPatient: 'New Patient',
    editClinic: 'Edit Clinic',
    switchPortal: 'Switch Portal',

    // Demographics & Registration
    patientRegistrationTitle: 'Patient Registration & Demographics',
    patientNameLabel: 'Full Patient Name *',
    patientNamePlaceholder: 'e.g. Ramesh Patel',
    ageLabel: 'Age (Years) *',
    genderLabel: 'Gender *',
    male: 'Male',
    female: 'Female',
    phoneLabel: 'Phone Number',
    phonePlaceholder: 'e.g. +91 98765 43210',
    uhidLabel: 'UHID / Hospital ID',
    villageCityLabel: 'Village / City',

    // Vitals
    mandatoryVitalsTitle: 'Mandatory Clinical Vitals',
    heartRate: 'Heart Rate (Pulse)',
    spo2: 'Oxygen Saturation (SpO2)',
    bloodPressure: 'Blood Pressure (BP)',
    bodyTemp: 'Body Temperature',
    height: 'Height (cm)',
    weight: 'Weight (kg)',
    derivedBmi: 'Derived BMI',
    normal: 'Normal',
    critical: 'Critical',
    normalRangeHeartRate: 'Normal: 60 - 100 bpm',
    normalRangeSpO2: 'Normal: 95 - 100% (Critical: <90%)',
    normalRangeBP: 'Normal: 120 / 80 mmHg',
    normalRangeTemp: 'Normal: 36.5 - 37.5 °C (97.7 - 99.5 °F)',

    // Stepper
    step1: '1. Vitals & Demographics',
    step2: '2. Chief Complaint',
    step3: '3. Dynamic Inquiry',
    step4: '4. Triage Decision',
    proceedToChiefComplaint: 'Proceed to Chief Complaint →',
    back: '← Back',

    // Chief Complaint
    chiefComplaintTitle: 'Select Chief Presenting Complaint',
    chiefComplaintDesc: 'Select the primary symptom the patient presented with to trigger context-aware adaptive questions.',
    searchComplaints: 'Search chief complaint...',
    feverComplaint: 'Fever & Chills',
    coughComplaint: 'Cough & Phlegm',
    chestPainComplaint: 'Chest Pain & Pressure',
    breathlessnessComplaint: 'Shortness of Breath',
    abdominalPainComplaint: 'Abdominal Pain & Cramps',
    dizzinessComplaint: 'Dizziness & Vertigo',
    vomitingComplaint: 'Nausea & Vomiting',
    headacheComplaint: 'Severe Headache',
    diarrheaComplaint: 'Diarrhea & Loose Stools',
    startAdaptiveQuestions: 'Start Adaptive AI Questions →',

    // Dynamic Inquiry
    dynamicInquiryTitle: 'Adaptive AI Clinical Inquiry',
    questionNumber: 'Question',
    yes: 'Yes',
    no: 'No',
    unknown: 'Unknown',
    calculatingTriage: 'Evaluating 150k encounter clinical triage model...',

    // Triage Result
    triageDecisionTitle: 'Clinical Triage Decision & Stratification',
    predictedRisk: 'Predicted Risk Level',
    highRisk: 'High Risk (Emergency Resuscitation)',
    mediumRisk: 'Medium Risk (Urgent Care)',
    lowRisk: 'Low Risk (Routine OPD)',
    confidenceScore: 'Model Confidence',
    clinicalFlags: 'Clinical Warning Flags',
    actionDirective: 'Recommended Clinical Action',
    printSlip: 'Print Clinical Triage Slip',
    openInDoctorStation: 'Open in Doctor Station (EMR & Prescriptions) →',
    intakeNextPatient: 'Intake Next Patient',

    // Doctor Station
    doctorConsultationTitle: 'Doctor Consultation & Prescription Station',
    doctorConsultationSubtitle: 'Review patient EMR intake records, examine clinical vitals, formulate diagnoses, and write digital prescriptions (Rx).',
    directDoctorConsult: '+ Direct Doctor Consultation',
    consultAndPrescribe: 'Consult & Prescribe Rx',
    searchRecordsPlaceholder: 'Search clinical records by Patient Name, UHID, Phone, or Diagnosis...',
    allRecords: 'All Records',
    waitingDoctor: 'Waiting Doctor',
    inConsultation: 'In Consultation',
    completed: 'Completed',
    highRiskFilter: 'High Risk Flagged',
    provisionalDiagnosis: 'Provisional Diagnosis',
    finalDiagnosis: 'Final Diagnosis',
    doctorNotes: 'Doctor Examination Notes & Findings',
    rxTitle: 'Digital Prescription (Rx)',
    medicineName: 'Medicine Name',
    dosage: 'Dosage / Form',
    timing: 'Timing Schedule',
    durationDays: 'Duration (Days)',
    foodInstruction: 'Food Instruction',
    afterFood: 'After Food',
    beforeFood: 'Before Food',
    withFood: 'With Food',
    emptyStomach: 'Empty Stomach',
    addToRx: '+ Add to Rx',
    saveClinicalRecord: 'Save Digital Clinical Record',
    cancel: 'Cancel',
    advisedLabTests: 'Advised Diagnostic Lab Tests:',
    officialStamp: 'Official Stamp',
    doctorSignature: "Doctor's Signature & Seal",

    // EMR Records Station
    emrIntakeTitle: 'Digital Clinical Records (EMR)',
    emrIntakeSubtitle: 'Manually enter walk-in clinical details, record patient vitals & symptoms, and view all digital health records.',
    addPatientRecordManual: '+ Add Patient Record (Manual Entry)',
    sendToDoctor: 'Send to Doctor',
    saveToEMR: 'Save to Digital EMR',
    sourceManual: 'Manual Intake',
    sourceMLTriage: 'ML Triage',
    sourceOnlineBooking: 'Online Booking',

    // Appointments Desk & Booking
    appointmentsDeskTitle: 'Online Appointment & Intake Manager',
    appointmentsDeskSubtitle: 'Review online appointment bookings from citizens, assign time slots, and start patient triage on arrival.',
    refreshQueue: 'Refresh Queue',
    searchAppointmentsPlaceholder: 'Search appointments by Patient Name, ID, Phone, or Reason...',
    pendingReview: 'Pending Review',
    confirmedSlots: 'Confirmed Slots',
    cancelled: 'Cancelled',
    confirmSlot: 'Confirm Slot',
    intakeAndStartTriage: 'Intake & Start Triage',
    markCompleted: 'Mark Completed',
    reasonForConsultation: 'Reason for Consultation',
    preferredDate: 'Preferred Date',
    assignedSlot: 'Assigned Slot',
    bookAppointmentBannerTitle: 'Book Clinic & OPD Appointment',
    bookAppointmentBannerSubtitle: 'Reserve consultation slots at Anand PHC, Civil Hospital & CHCs',
    bookAppointmentModalTitle: 'Book Clinic & Hospital Appointment',
    bookAppointmentModalSubtitle: 'Direct OPD slot reservation with government & enrolled health centers',
    chooseEnrolledClinic: 'Choose Enrolled Clinic / Hospital *',
    departmentSpecialty: 'Department / Specialty *',
    submitBookingRequest: 'Confirm Appointment Request',
    bookingSuccessTitle: 'Appointment Requested Successfully!',
    bookingSuccessDesc: 'Your appointment request has been submitted. The clinic reception will assign your time slot shortly.',
    myAppointmentsTitle: 'My Clinic & OPD Appointments',
    myAppointmentsSubtitle: 'Live status of consultations requested at community and hospital clinics',
    bookNewAppointment: '+ Book New Appointment',
    noAppointmentsFound: 'No clinic appointments booked yet.',

    // Portal Selector
    selectPortalTitle: 'Nirāmay Smart Health Platform',
    selectPortalSubtitle: 'Select operating environment for this terminal:',
    communityPortalCardTitle: 'Citizen & Family Health Vault',
    communityPortalCardDesc: 'Household health records, medication reminders, child growth charts, symptom checks & clinic booking.',
    clinicPortalCardTitle: 'Clinical Triage & Hospital EMR',
    clinicPortalCardDesc: '150,000 Encounter ML Triage, Paperless EMR Records, Doctor Station & Digital Prescriptions (Rx).',
    enterCommunityPortal: 'Enter Family Vault →',
    enterClinicPortal: 'Enter Clinical Portal →'
  }
};

export function getTranslations(lang: LanguageCode): TranslationDictionary {
  return CLINICAL_TRANSLATIONS[lang] || CLINICAL_TRANSLATIONS.en;
}

export interface ChiefComplaintCategoryData {
  title: string;
  items: Array<{ id: string; label: string; enLabel: string }>;
}

export const CHIEF_COMPLAINT_DATA: Record<LanguageCode, ChiefComplaintCategoryData[]> = {
  gu: [
    {
      title: 'ચેપી અને શ્વસનતંત્ર (Infectious & Respiratory)',
      items: [
        { id: 'cc_fever', label: 'તાવ / ઊંચું તાપમાન', enLabel: 'Fever / High Temperature' },
        { id: 'cc_cough', label: 'સતત ઉધરસ', enLabel: 'Persistent Cough' },
        { id: 'cc_coldlikesymptoms', label: 'શરદી / નાકમાંથી પાણી વહેવું', enLabel: 'Common Cold / Runny Nose' },
        { id: 'cc_sorethroat', label: 'ગળામાં દુખાવો / ખરાશ', enLabel: 'Sore Throat / Pharyngitis' },
        { id: 'cc_chills', label: 'ધ્રુજારી અને ટાઢ', enLabel: 'Chills & Shivering' },
        { id: 'cc_earpain', label: 'કાનમાં દુખાવો / ભારેપણું', enLabel: 'Ear Pain / Fullness' }
      ]
    },
    {
      title: 'હૃદય અને છાતી (Cardiovascular & Thoracic)',
      items: [
        { id: 'cc_chestpain', label: 'છાતીમાં દુખાવો / એન્જાઇના', enLabel: 'Chest Pain / Angina' },
        { id: 'cc_shortnessofbreath', label: 'શ્વાસ લેવામાં તકલીફ', enLabel: 'Shortness of Breath (Dyspnea)' },
        { id: 'cc_chesttightness', label: 'છાતીમાં ભીંસ / દબાણ', enLabel: 'Chest Tightness / Squeezing' },
        { id: 'cc_palpitations', label: 'ધબકારા વધવા / ધડકન', enLabel: 'Palpitations / Fast Heartbeat' },
        { id: 'cc_tachycardia', label: 'ઝડપી પલ્સ (ટાકીકાર્ડિયા)', enLabel: 'Racing Pulse (Tachycardia)' },
        { id: 'cc_edema', label: 'પગમાં સોજા / એડીમા', enLabel: 'Swollen Feet / Edema' }
      ]
    },
    {
      title: 'પાચનતંત્ર અને પેટ (Gastrointestinal & Abdominal)',
      items: [
        { id: 'cc_abdominalpain', label: 'પેટમાં દુખાવો / ચૂંક', enLabel: 'Abdominal Pain / Cramps' },
        { id: 'cc_vomiting', label: 'ઊલટી / ઓકવું', enLabel: 'Vomiting / Emesis' },
        { id: 'cc_nausea', label: 'ઉબકા / જીવ ગભરાવવો', enLabel: 'Nausea' },
        { id: 'cc_diarrhea', label: 'ઝાડા / પાતળા મળ', enLabel: 'Diarrhea / Loose Stools' },
        { id: 'cc_gibleeding', label: 'કાળો મળ / રક્તસ્ત્રાવ', enLabel: 'GI Bleeding / Dark Stools' },
        { id: 'cc_dehydration', label: 'ડિહાઇડ્રેશન / મોં સુકાવું', enLabel: 'Dehydration / Dry Mouth' }
      ]
    },
    {
      title: 'ચેતાતંત્ર અને મગજ (Neurological & Systemic)',
      items: [
        { id: 'cc_headache', label: 'તીવ્ર માથાનો દુખાવો / આધાશીશી', enLabel: 'Severe Headache' },
        { id: 'cc_dizziness', label: 'ચક્કર આવવા / અસમતુલા', enLabel: 'Dizziness / Vertigo' },
        { id: 'cc_syncope', label: 'બેહોશ થઈ જવું / ચક્કર ખાઈ પડવું', enLabel: 'Syncope (Fainting)' },
        { id: 'cc_confusion', label: 'ગૂંચવણ / અસ્વસ્થ મગજ', enLabel: 'Acute Confusion' },
        { id: 'cc_alteredmentalstatus', label: 'માનસિક સ્થિતિમાં ફેરફાર', enLabel: 'Altered Mental State' },
        { id: 'cc_fatigue', label: 'અતિશય થાક / અશક્તિ', enLabel: 'Extreme Weakness / Fatigue' }
      ]
    },
    {
      title: 'ચયાપચય, કિડની અને ઈજા (Metabolic, Renal & Trauma)',
      items: [
        { id: 'cc_decreasedbloodsugar-symptomatic', label: 'ઓછું બ્લડ સુગર (હાઈપોગ્લાયસેમિયા)', enLabel: 'Low Blood Sugar (Hypoglycemia)' },
        { id: 'cc_elevatedbloodsugar-symptomatic', label: 'વધારે બ્લડ સુગર (હાઈપરગ્લાયસેમિયા)', enLabel: 'High Blood Sugar (Hyperglycemia)' },
        { id: 'cc_dysuria', label: 'પેશાબમાં બળતરા / દુખાવો', enLabel: 'Painful Urination (Dysuria)' },
        { id: 'cc_flankpain', label: 'કમર / કિડનીમાં દુખાવો', enLabel: 'Flank / Kidney Pain' },
        { id: 'cc_laceration', label: 'ખુલ્લો ઘા / લોહી નીકળવું', enLabel: 'Open Cut / Wound' },
        { id: 'cc_skinproblem', label: 'ચામડીના ચકામા / એલર્જી', enLabel: 'Skin Rash / Allergy' }
      ]
    }
  ],
  hi: [
    {
      title: 'संक्रामक एवं श्वसन तंत्र (Infectious & Respiratory)',
      items: [
        { id: 'cc_fever', label: 'बुखार / तेज तापमान', enLabel: 'Fever / High Temperature' },
        { id: 'cc_cough', label: 'लगातार खांसी', enLabel: 'Persistent Cough' },
        { id: 'cc_coldlikesymptoms', label: 'सर्दी / बहती नाक', enLabel: 'Common Cold / Runny Nose' },
        { id: 'cc_sorethroat', label: 'गले में खराश / दर्द', enLabel: 'Sore Throat / Pharyngitis' },
        { id: 'cc_chills', label: 'कंपकंपी एवं ठंड', enLabel: 'Chills & Shivering' },
        { id: 'cc_earpain', label: 'कान में दर्द / भारीपन', enLabel: 'Ear Pain / Fullness' }
      ]
    },
    {
      title: 'हृदय एवं वक्ष (Cardiovascular & Thoracic)',
      items: [
        { id: 'cc_chestpain', label: 'सीने में दर्द / एंजाइना', enLabel: 'Chest Pain / Angina' },
        { id: 'cc_shortnessofbreath', label: 'सांस लेने में तकलीफ', enLabel: 'Shortness of Breath (Dyspnea)' },
        { id: 'cc_chesttightness', label: 'सीने में जकड़न एवं दबाव', enLabel: 'Chest Tightness / Squeezing' },
        { id: 'cc_palpitations', label: 'घबराहट / तेज धड़कन', enLabel: 'Palpitations / Fast Heartbeat' },
        { id: 'cc_tachycardia', label: 'तेज पल्स (टैचीकार्डिया)', enLabel: 'Racing Pulse (Tachycardia)' },
        { id: 'cc_edema', label: 'पैरों में सूजन / एडिमा', enLabel: 'Swollen Feet / Edema' }
      ]
    },
    {
      title: 'पाचन तंत्र एवं पेट (Gastrointestinal & Abdominal)',
      items: [
        { id: 'cc_abdominalpain', label: 'पेट में दर्द / मरोड़', enLabel: 'Abdominal Pain / Cramps' },
        { id: 'cc_vomiting', label: 'उल्टी / वमन', enLabel: 'Vomiting / Emesis' },
        { id: 'cc_nausea', label: 'मतली / जी मिचलाना', enLabel: 'Nausea' },
        { id: 'cc_diarrhea', label: 'दस्त / पतले दस्त', enLabel: 'Diarrhea / Loose Stools' },
        { id: 'cc_gibleeding', label: 'काला मल / रक्तस्राव', enLabel: 'GI Bleeding / Dark Stools' },
        { id: 'cc_dehydration', label: 'निर्जलीकरण / मुंह सूखना', enLabel: 'Dehydration / Dry Mouth' }
      ]
    },
    {
      title: 'तंत्रिका तंत्र एवं मस्तिष्क (Neurological & Systemic)',
      items: [
        { id: 'cc_headache', label: 'तेज सिरदर्द / माइग्रेन', enLabel: 'Severe Headache' },
        { id: 'cc_dizziness', label: 'चक्कर आना / अस्थिरता', enLabel: 'Dizziness / Vertigo' },
        { id: 'cc_syncope', label: 'बेहोशी / चक्कर खाकर गिरना', enLabel: 'Syncope (Fainting)' },
        { id: 'cc_confusion', label: 'भ्रम / अस्थिर दिमाग', enLabel: 'Acute Confusion' },
        { id: 'cc_alteredmentalstatus', label: 'मानसिक स्थिति में बदलाव', enLabel: 'Altered Mental State' },
        { id: 'cc_fatigue', label: 'अत्यधिक कमजोरी / थकान', enLabel: 'Extreme Weakness / Fatigue' }
      ]
    },
    {
      title: 'उपापचय, गुर्दा एवं आघात (Metabolic, Renal & Trauma)',
      items: [
        { id: 'cc_decreasedbloodsugar-symptomatic', label: 'कम ब्लड शुगर (हाइपोग्लाइसीमिया)', enLabel: 'Low Blood Sugar (Hypoglycemia)' },
        { id: 'cc_elevatedbloodsugar-symptomatic', label: 'उच्च ब्लड शुगर (हाइपरग्लाइसीमिया)', enLabel: 'High Blood Sugar (Hyperglycemia)' },
        { id: 'cc_dysuria', label: 'पेशाब में जलन / दर्द', enLabel: 'Painful Urination (Dysuria)' },
        { id: 'cc_flankpain', label: 'कमर / गुर्दे का दर्द', enLabel: 'Flank / Kidney Pain' },
        { id: 'cc_laceration', label: 'खुला घाव / चोट', enLabel: 'Open Cut / Wound' },
        { id: 'cc_skinproblem', label: 'त्वचा पर दाने / एलर्जी', enLabel: 'Skin Rash / Allergy' }
      ]
    }
  ],
  en: [
    {
      title: 'Infectious & Respiratory',
      items: [
        { id: 'cc_fever', label: 'Fever / High Temperature', enLabel: 'Fever / High Temperature' },
        { id: 'cc_cough', label: 'Persistent Cough', enLabel: 'Persistent Cough' },
        { id: 'cc_coldlikesymptoms', label: 'Common Cold / Runny Nose', enLabel: 'Common Cold / Runny Nose' },
        { id: 'cc_sorethroat', label: 'Sore Throat / Pharyngitis', enLabel: 'Sore Throat / Pharyngitis' },
        { id: 'cc_chills', label: 'Chills & Shivering', enLabel: 'Chills & Shivering' },
        { id: 'cc_earpain', label: 'Ear Pain / Fullness', enLabel: 'Ear Pain / Fullness' }
      ]
    },
    {
      title: 'Cardiovascular & Thoracic',
      items: [
        { id: 'cc_chestpain', label: 'Chest Pain / Angina', enLabel: 'Chest Pain / Angina' },
        { id: 'cc_shortnessofbreath', label: 'Shortness of Breath (Dyspnea)', enLabel: 'Shortness of Breath (Dyspnea)' },
        { id: 'cc_chesttightness', label: 'Chest Tightness / Squeezing', enLabel: 'Chest Tightness / Squeezing' },
        { id: 'cc_palpitations', label: 'Palpitations / Fast Heartbeat', enLabel: 'Palpitations / Fast Heartbeat' },
        { id: 'cc_tachycardia', label: 'Racing Pulse (Tachycardia)', enLabel: 'Racing Pulse (Tachycardia)' },
        { id: 'cc_edema', label: 'Swollen Feet / Edema', enLabel: 'Swollen Feet / Edema' }
      ]
    },
    {
      title: 'Gastrointestinal & Abdominal',
      items: [
        { id: 'cc_abdominalpain', label: 'Abdominal Pain / Stomach Cramps', enLabel: 'Abdominal Pain / Stomach Cramps' },
        { id: 'cc_vomiting', label: 'Vomiting / Emesis', enLabel: 'Vomiting / Emesis' },
        { id: 'cc_nausea', label: 'Nausea', enLabel: 'Nausea' },
        { id: 'cc_diarrhea', label: 'Diarrhea / Loose Stools', enLabel: 'Diarrhea / Loose Stools' },
        { id: 'cc_gibleeding', label: 'GI Bleeding / Dark Stools', enLabel: 'GI Bleeding / Dark Stools' },
        { id: 'cc_dehydration', label: 'Dehydration / Dry Mouth', enLabel: 'Dehydration / Dry Mouth' }
      ]
    },
    {
      title: 'Neurological & Systemic',
      items: [
        { id: 'cc_headache', label: 'Severe Headache', enLabel: 'Severe Headache' },
        { id: 'cc_dizziness', label: 'Dizziness / Vertigo', enLabel: 'Dizziness / Vertigo' },
        { id: 'cc_syncope', label: 'Syncope (Fainting / Blackout)', enLabel: 'Syncope (Fainting / Blackout)' },
        { id: 'cc_confusion', label: 'Acute Confusion', enLabel: 'Acute Confusion' },
        { id: 'cc_alteredmentalstatus', label: 'Altered Mental State', enLabel: 'Altered Mental State' },
        { id: 'cc_fatigue', label: 'Extreme Weakness / Fatigue', enLabel: 'Extreme Weakness / Fatigue' }
      ]
    },
    {
      title: 'Metabolic, Renal & Trauma',
      items: [
        { id: 'cc_decreasedbloodsugar-symptomatic', label: 'Low Blood Sugar (Hypoglycemia)', enLabel: 'Low Blood Sugar (Hypoglycemia)' },
        { id: 'cc_elevatedbloodsugar-symptomatic', label: 'High Blood Sugar (Hyperglycemia)', enLabel: 'High Blood Sugar (Hyperglycemia)' },
        { id: 'cc_dysuria', label: 'Painful Urination (Dysuria)', enLabel: 'Painful Urination (Dysuria)' },
        { id: 'cc_flankpain', label: 'Flank / Kidney Pain', enLabel: 'Flank / Kidney Pain' },
        { id: 'cc_laceration', label: 'Open Cut / Wound', enLabel: 'Open Cut / Wound' },
        { id: 'cc_skinproblem', label: 'Skin Rash / Lesion', enLabel: 'Skin Rash / Lesion' }
      ]
    }
  ]
};

export function getChiefComplaintCategories(lang: LanguageCode) {
  return CHIEF_COMPLAINT_DATA[lang] || CHIEF_COMPLAINT_DATA.en;
}

export function getChiefComplaintLabel(id: string, lang: LanguageCode): string {
  const cats = getChiefComplaintCategories(lang);
  for (const cat of cats) {
    const found = cat.items.find((item) => item.id === id);
    if (found) return found.label;
  }
  return id.replace('cc_', '').replace(/([A-Z])/g, ' $1').replace('/', ' / ');
}

export interface RiskDetailsData {
  categoryTitle: string;
  categorySubtitle: string;
  immediateAction: string;
  recommendedInvestigations: string[];
  riskProbabilitiesLabel: string;
  lowLabel: string;
  medLabel: string;
  highLabel: string;
  actionPlanTitle: string;
  immediateActionLabel: string;
  investigationsLabel: string;
  vitalsRecordLabel: string;
  confirmedSymptomsLabel: string;
  slipTitle: string;
  slipHeader: string;
  patientLabel: string;
  ageSexLabel: string;
  uhidLabel: string;
  chiefComplaintLabel: string;
  riskBadgeLabel: string;
  attendingMOLabel: string;
  doctorSealLabel: string;
  signStampLabel: string;
  printSlipButton: string;
  openDoctorStationButton: string;
  intakeNextButton: string;
}

export function getRiskDetails(riskCategory: 'High' | 'Medium' | 'Low' | string, lang: LanguageCode): RiskDetailsData {
  if (lang === 'gu') {
    return {
      categoryTitle: riskCategory === 'High' ? 'ઉચ્ચ જોખમ વર્ગ (HIGH RISK EMERGENCY)' : riskCategory === 'Medium' ? 'મધ્યમ જોખમ વર્ગ (MEDIUM RISK URGENT)' : 'ઓછું જોખમ વર્ગ (LOW RISK ROUTINE)',
      categorySubtitle: riskCategory === 'High' ? 'તાત્કાલિક ઇમરજન્સી અને રેફરલ કેર • તાત્કાલિક હોસ્પિટલ પહોંચો' : riskCategory === 'Medium' ? 'ઝડપી પ્રાથમિક કન્સલ્ટેશન • ૧ કલાકમાં ડૉક્ટર તપાસ' : 'સામાન્ય OPD સારવાર • નિયમિત ક્લિનિકલ કન્સલ્ટેશન',
      immediateAction: riskCategory === 'High'
        ? 'તાત્કાલિક ઇમરજન્સી સારવાર, ઓક્સિજન સપોર્ટ, IV એક્સેસ અને સિવિલ/ટ્રૉમા સેન્ટરમાં તાત્કાલિક રેફરલ.'
        : riskCategory === 'Medium'
        ? 'પ્રાથમિક તપાસ, 30 મિનિટમાં વાઇટલ્સ મોનિટરિંગ અને ડૉક્ટર દ્વારા ૧ કલાકમાં વિગતવાર નિદાન.'
        : 'સામાન્ય OPD કન્સલ્ટેશન, લક્ષણો અનુસાર દવા, ઘરેલું આરામ અને જરૂર જણાયે ૪૮ કલાકમાં ફોલો-અપ.',
      recommendedInvestigations: riskCategory === 'High'
        ? [
            '૧૨-લીડ ઇલેક્ટ્રોકાર્ડિયોગ્રામ (12-Lead ECG)',
            'આર્ટેરિયલ બ્લડ ગેસ (ABG) અને સીરમ લેક્ટેટ',
            'કમ્પ્લીટ બ્લડ કાઉન્ટ (CBC) અને કાર્ડિયાક ટ્રોપોનિન-I',
            'તાત્કાલિક IV એક્સેસ અને સતત SpO2 મોનિટરિંગ'
          ]
        : riskCategory === 'Medium'
        ? [
            'દર ૩૦ મિનિટે વાઇટલ્સ સાઇન્સ મોનિટરિંગ',
            'બ્લડ ગ્લુકોઝ (RBS) અને કમ્પ્લીટ બ્લડ કાઉન્ટ (CBC)',
            'છાતી અને ફેફસાંની સ્ટેથોસ્કોપ તપાસ',
            '૧ કલાકની અંદર મેડિકલ ઓફિસર દ્વારા મૂલ્યાંકન'
          ]
        : [
            'સામાન્ય વાઇટલ્સ તપાસ (BP, SpO2, Temp)',
            'લક્ષણો આધારિત સહાયક સારવાર',
            'ઓરલ રીહાઇડ્રેશન (ORS) અને આરામની સલાહ',
            'જો તકલીફ વધે તો ૪૮ કલાકમાં પુનઃ મુલાકાત'
          ],
      riskProbabilitiesLabel: 'જોખમ સંભાવનાઓ',
      lowLabel: 'ઓછું',
      medLabel: 'મધ્યમ',
      highLabel: 'ઉચ્ચ',
      actionPlanTitle: 'ક્લિનિકલ એક્શન પ્લાન અને ટ્રાયજ માર્ગદર્શિકા',
      immediateActionLabel: 'તાત્કાલિક ક્લિનિકલ પગલાં',
      investigationsLabel: 'સૂચવેલ લેબ અને તપાસ',
      vitalsRecordLabel: 'દર્દીના નોંધાયેલા વાઇટલ્સ',
      confirmedSymptomsLabel: 'પુષ્ટિ થયેલ લક્ષણો',
      slipTitle: 'રેફરલ અને ટ્રાયજ સ્લિપ',
      slipHeader: 'સત્તાવાર ક્લિનિકલ ટ્રાયજ સ્લિપ',
      patientLabel: 'દર્દી',
      ageSexLabel: 'ઉંમર/જાતિ',
      uhidLabel: 'UHID',
      chiefComplaintLabel: 'મુખ્ય તકલીફ',
      riskBadgeLabel: riskCategory === 'High' ? 'ઉચ્ચ જોખમ' : riskCategory === 'Medium' ? 'મધ્યમ જોખમ' : 'ઓછું જોખમ',
      attendingMOLabel: 'હાજર મેડિકલ ઓફિસર (MO)',
      doctorSealLabel: 'ડૉક્ટર સિક્કો',
      signStampLabel: 'સહી અને સિક્કો',
      printSlipButton: 'ક્લિનિકલ ટ્રાયજ સ્લિપ પ્રિન્ટ કરો',
      openDoctorStationButton: 'ડૉક્ટર સ્ટેશનમાં ખોલો (EMR અને દવાઓ) →',
      intakeNextButton: '+ આગામી દર્દી દાખલ કરો'
    };
  }

  if (lang === 'hi') {
    return {
      categoryTitle: riskCategory === 'High' ? 'उच्च जोखिम वर्ग (HIGH RISK EMERGENCY)' : riskCategory === 'Medium' ? 'मध्यम जोखिम वर्ग (MEDIUM RISK URGENT)' : 'निम्न जोखिम वर्ग (LOW RISK ROUTINE)',
      categorySubtitle: riskCategory === 'High' ? 'तत्काल आपातकालीन देखभाल एवं रेफरल • तुरंत अस्पताल जाएं' : riskCategory === 'Medium' ? 'प्राथमिक परामर्श • 1 घंटे में डॉक्टर मूल्यांकन' : 'सामान्य OPD देखभाल • नियमित क्लिनिक परामर्श',
      immediateAction: riskCategory === 'High'
        ? 'तत्काल आपातकालीन उपचार, ऑक्सीजन सहायता, IV एक्सेस और ट्रॉमा सेंटर में रेफरल।'
        : riskCategory === 'Medium'
        ? 'प्राथमिक जांच, 30 मिनट में वाइटल्स की निगरानी और 1 घंटे में डॉक्टर मूल्यांकन।'
        : 'मानक OPD परामर्श, लक्षण आधारित दवाएं, घरेलू देखभाल और फॉलो-अप।',
      recommendedInvestigations: riskCategory === 'High'
        ? [
            '12-लीड इलेक्ट्रोकार्डियोग्राम (12-Lead ECG)',
            'आर्टेरियल ब्लड गैस (ABG) एवं सीरम लैक्टेट',
            'कम्प्लीट ब्लड काउंट (CBC) एवं कार्डियक ट्रोपोनिन-I',
            'तत्काल IV एक्सेस और निरंतर SpO2 मॉनिटरिंग'
          ]
        : riskCategory === 'Medium'
        ? [
            'प्रत्येक 30 मिनट में वाइटल्स की निगरानी',
            'ब्लड ग्लूकोज एवं कम्प्लीट ब्लड काउंट (CBC)',
            'छाती एवं फेफड़ों की जांच',
            '1 घंटे के भीतर डॉक्टर द्वारा मूल्यांकन'
          ]
        : [
            'मानक वाइटल्स जांच (BP, SpO2, Temp)',
            'लक्षण आधारित सहायक उपचार',
            'ओआरएस एवं आराम की सलाह',
            'स्थिति बिगड़ने पर 48 घंटों में पुनः जांच'
          ],
      riskProbabilitiesLabel: 'जोखिम संभावनाएं',
      lowLabel: 'निम्न',
      medLabel: 'मध्यम',
      highLabel: 'उच्च',
      actionPlanTitle: 'क्लिनिकल एक्शन प्लान एवं ट्राइएज निर्देश',
      immediateActionLabel: 'तत्काल क्लिनिकल कदम',
      investigationsLabel: 'अनुशंसित जांचें',
      vitalsRecordLabel: 'मरीज के दर्ज वाइटल्स',
      confirmedSymptomsLabel: 'पुष्ट लक्षण',
      slipTitle: 'रेफरल एवं ट्राइएज पर्ची',
      slipHeader: 'आधिकारिक क्लिनिकल ट्राइएज पर्ची',
      patientLabel: 'मरीज',
      ageSexLabel: 'आयु/लिंग',
      uhidLabel: 'UHID',
      chiefComplaintLabel: 'मुख्य समस्या',
      riskBadgeLabel: riskCategory === 'High' ? 'उच्च जोखिम' : riskCategory === 'Medium' ? 'मध्यम जोखिम' : 'निम्न जोखिम',
      attendingMOLabel: 'उपस्थित मेडिकल ऑफिसर (MO)',
      doctorSealLabel: 'डॉक्टर मुहर',
      signStampLabel: 'हस्ताक्षर एवं मुहर',
      printSlipButton: 'क्लिनिकल ट्राइएज पर्ची प्रिंट करें',
      openDoctorStationButton: 'डॉक्टर स्टेशन में खोलें (EMR और दवाएं) →',
      intakeNextButton: '+ अगला मरीज भर्ती करें'
    };
  }

  // English fallback
  return {
    categoryTitle: `${riskCategory.toUpperCase()} RISK CATEGORY`,
    categorySubtitle: riskCategory === 'High' ? 'Emergency Resuscitation (Level 1-2) • Immediate physician intervention' : riskCategory === 'Medium' ? 'Urgent Care (Level 3) • Priority physician evaluation within 1 hour' : 'Routine Outpatient Care (Level 4-5) • Routine clinic appointment',
    immediateAction: riskCategory === 'High'
      ? 'Emergency resuscitation, immediate oxygen, IV access, and urgent hospital referral.'
      : riskCategory === 'Medium'
      ? 'Priority evaluation, frequent vital sign checks, and physician evaluation within 1 hour.'
      : 'Standard outpatient consultation, symptomatic management, home care advisory and scheduled follow-up.',
    recommendedInvestigations: riskCategory === 'High'
      ? [
          '12-Lead Electrocardiogram (ECG)',
          'Arterial Blood Gas (ABG) & Serum Lactate',
          'Complete Blood Count & Cardiac Troponin-I',
          'Immediate IV access & Continuous SpO2 Monitoring'
        ]
      : riskCategory === 'Medium'
      ? [
          'Vital sign monitoring every 30 minutes',
          'Blood Glucose & CBC with Differential',
          'Focused physical & chest auscultation',
          'Physician evaluation within 1 hour'
        ]
      : [
          'Standard vital sign checkup',
          'Symptomatic supportive treatment',
          'Oral rehydration & rest advice',
          'Follow up in 48 hours if worsening'
        ],
    riskProbabilitiesLabel: 'Risk Probabilities',
    lowLabel: 'Low',
    medLabel: 'Med',
    highLabel: 'High',
    actionPlanTitle: 'Clinical Action Plan & Triage Directives',
    immediateActionLabel: 'Immediate Clinical Action',
    investigationsLabel: 'Recommended Investigations',
    vitalsRecordLabel: 'Patient Vitals Record',
    confirmedSymptomsLabel: 'Confirmed Symptoms',
    slipTitle: 'Referral & Triage Slip',
    slipHeader: 'Official Clinical Triage Slip',
    patientLabel: 'Patient',
    ageSexLabel: 'Age/Sex',
    uhidLabel: 'UHID',
    chiefComplaintLabel: 'Chief Complaint',
    riskBadgeLabel: `${riskCategory} Risk`,
    attendingMOLabel: 'Attending MO',
    doctorSealLabel: "Doctor's Seal",
    signStampLabel: 'Sign & Stamp',
    printSlipButton: 'Print Clinical Triage Slip',
    openDoctorStationButton: 'Open in Doctor Station (EMR & Prescriptions) →',
    intakeNextButton: '+ Intake Next Patient'
  };
}
